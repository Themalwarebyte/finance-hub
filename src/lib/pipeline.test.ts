// Phase 4 Sprint 1 — lead pipeline, follow-ups, activity tracker and
// workspace-permission guard tests. All pure functions; no Convex runtime.
import { describe, expect, test } from "bun:test";
import {
  ACTIVITY_KINDS,
  DEFAULT_ACTIVITY_TARGETS,
  LEGACY_STAGE_ALIASES,
  SALES_STAGES,
  STAGE_DEFAULT_PROBABILITY,
  activityStatus,
  canonicalStage,
  followUpState,
  isConvertible,
  leadProbability,
  pipelineMetrics,
  stageIsOpen,
  stageOrder,
  weekStartMs,
} from "./business";
import { assertBusinessOwns } from "@/convex/businessAccess";

const DAY = 86_400_000;

// ---------------------------------------------------------------------------
// Pipeline stages
// ---------------------------------------------------------------------------

describe("pipeline stages", () => {
  test("the eight-stage pipeline is defined in order", () => {
    expect(SALES_STAGES).toEqual([
      "New Lead",
      "Contacted",
      "Conversation Started",
      "Discovery Meeting",
      "Proposal Sent",
      "Negotiation",
      "Won",
      "Lost",
    ]);
  });

  test("legacy stage names canonicalize forward", () => {
    expect(canonicalStage("New")).toBe("New Lead");
    expect(canonicalStage("Discovery")).toBe("Discovery Meeting");
    expect(canonicalStage("Proposal")).toBe("Proposal Sent");
    expect(canonicalStage("Contacted")).toBe("Contacted");
    expect(canonicalStage("Nope")).toBeNull();
    expect(Object.keys(LEGACY_STAGE_ALIASES)).toEqual(["New", "Discovery", "Proposal"]);
  });

  test("open/terminal classification and conversion", () => {
    for (const stage of ["New Lead", "Contacted", "Conversation Started", "Discovery Meeting", "Proposal Sent", "Negotiation"]) {
      expect(stageIsOpen(stage)).toBe(true);
      expect(isConvertible(stage)).toBe(false);
    }
    expect(stageIsOpen("Won")).toBe(false);
    expect(stageIsOpen("Lost")).toBe(false);
    expect(isConvertible("Won")).toBe(true);
    // Legacy open names stay open.
    expect(stageIsOpen("New")).toBe(true);
  });

  test("stageOrder is monotonic across the pipeline", () => {
    const orders = SALES_STAGES.map(stageOrder);
    for (let i = 1; i < orders.length; i += 1) {
      expect(orders[i]).toBe(orders[i - 1] + 1);
    }
    expect(stageOrder("Discovery")).toBe(stageOrder("Discovery Meeting"));
  });

  test("default win probability rises monotonically to Won", () => {
    const seq = SALES_STAGES.map((s) => STAGE_DEFAULT_PROBABILITY[s]);
    for (let i = 1; i < seq.length; i += 1) {
      if (SALES_STAGES[i] !== "Lost") expect(seq[i]).toBeGreaterThanOrEqual(seq[i - 1]);
    }
    expect(STAGE_DEFAULT_PROBABILITY.Won).toBe(100);
    expect(STAGE_DEFAULT_PROBABILITY.Lost).toBe(0);
    expect(leadProbability("Discovery Meeting", null)).toBe(40);
    expect(leadProbability("Won", 85)).toBe(85); // explicit override
    expect(leadProbability("Won", 150)).toBe(100); // clamped invalid → default
  });
});

// ---------------------------------------------------------------------------
// Pipeline analytics
// ---------------------------------------------------------------------------

describe("pipeline metrics", () => {
  const NOW = Date.UTC(2026, 9, 15); // mid-October 2026

  test("totals, pipeline value and weighted value", () => {
    const leads = [
      { stage: "New Lead", estimatedValueCents: 100_000, createdAt: NOW },
      { stage: "Proposal Sent", estimatedValueCents: 200_000, createdAt: NOW },
      { stage: "Negotiation", estimatedValueCents: 300_000, probabilityPct: 50, createdAt: NOW },
      { stage: "Won", estimatedValueCents: 400_000, createdAt: NOW, closedAtMs: NOW },
      { stage: "Lost", estimatedValueCents: 500_000, createdAt: NOW, closedAtMs: NOW },
    ];
    const m = pipelineMetrics(leads, NOW);
    expect(m.totalLeads).toBe(5);
    expect(m.activeOpportunities).toBe(3);
    expect(m.pipelineValueCents).toBe(600_000);
    // Weighted: 100k×5% + 200k×55% + 300k×50% = 5k + 110k + 150k
    expect(m.weightedPipelineValueCents).toBe(265_000);
    expect(m.wonCount).toBe(1);
    expect(m.lostCount).toBe(1);
    expect(m.conversionRatePct).toBe(50);
    expect(m.averageDealSizeCents).toBe(400_000);
  });

  test("conversion rate is null when nothing has closed", () => {
    const m = pipelineMetrics([{ stage: "New Lead", estimatedValueCents: 1, createdAt: NOW }], NOW);
    expect(m.conversionRatePct).toBeNull();
    expect(m.averageDealSizeCents).toBeNull();
    expect(m.averageSalesCycleMs).toBeNull();
  });

  test("average sales cycle uses closedAtMs minus createdAt", () => {
    const m = pipelineMetrics(
      [
        { stage: "Won", estimatedValueCents: 100, createdAt: NOW, closedAtMs: NOW + 10 * DAY },
        { stage: "Won", estimatedValueCents: 100, createdAt: NOW, closedAtMs: NOW + 20 * DAY },
      ],
      NOW,
    );
    expect(m.averageSalesCycleMs).toBe(15 * DAY);
  });

  test("won revenue this month counts only closed-in-month wins", () => {
    const leads = [
      { stage: "Won", estimatedValueCents: 100, createdAt: NOW - 40 * DAY, closedAtMs: NOW - 35 * DAY }, // September
      { stage: "Won", estimatedValueCents: 200, createdAt: NOW - 5 * DAY, closedAtMs: NOW - 2 * DAY }, // October
      { stage: "Won", estimatedValueCents: 400, createdAt: NOW - 1 * DAY, closedAtMs: null }, // fallback createdAt
    ];
    const m = pipelineMetrics(leads, NOW);
    expect(m.wonRevenueThisMonthCents).toBe(600);
  });

  test("legacy stage names count correctly in metrics", () => {
    const m = pipelineMetrics(
      [
        { stage: "New", estimatedValueCents: 100, createdAt: NOW },
        { stage: "Discovery", estimatedValueCents: 200, createdAt: NOW },
      ],
      NOW,
    );
    expect(m.activeOpportunities).toBe(2);
    expect(m.pipelineValueCents).toBe(300);
  });
});

// ---------------------------------------------------------------------------
// Follow-up reminders
// ---------------------------------------------------------------------------

describe("follow-up states", () => {
  const NOW = Date.UTC(2026, 9, 15, 12, 0, 0);

  test("overdue / today / upcoming / none", () => {
    expect(followUpState(NOW - DAY, NOW)).toBe("overdue");
    expect(followUpState(Date.UTC(2026, 9, 15, 8, 0, 0), NOW)).toBe("today");
    expect(followUpState(NOW + DAY, NOW)).toBe("upcoming");
    expect(followUpState(null, NOW)).toBeNull();
    expect(followUpState(undefined, NOW)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Weekly activity tracker
// ---------------------------------------------------------------------------

describe("CEO activity tracker", () => {
  test("six activity kinds with suggested targets", () => {
    expect(ACTIVITY_KINDS).toEqual([
      "businesses_researched",
      "new_contacts",
      "follow_ups_completed",
      "discovery_meetings",
      "proposals_sent",
      "contracts_won",
    ]);
    expect(DEFAULT_ACTIVITY_TARGETS.businesses_researched).toBe(15);
    expect(DEFAULT_ACTIVITY_TARGETS.new_contacts).toBe(10);
    expect(DEFAULT_ACTIVITY_TARGETS.discovery_meetings).toBe(2);
    expect(DEFAULT_ACTIVITY_TARGETS.proposals_sent).toBe(1);
  });

  test("weekStartMs returns a Monday 00:00 UTC", () => {
    const wednesday = Date.UTC(2026, 9, 14); // Wed Oct 14 2026
    const monday = weekStartMs(wednesday);
    const d = new Date(monday);
    expect(d.getUTCDay()).toBe(1);
    expect(d.getUTCHours()).toBe(0);
    expect(monday).toBe(Date.UTC(2026, 9, 12));
  });

  test("weekly status: ahead / on track / behind by elapsed pace", () => {
    const wednesday = Date.UTC(2026, 9, 14, 12, 0, 0); // 2.5 days in (~35.7% expected)
    // Target 10, done 9 → 90% vs ~36% expected → ahead.
    expect(activityStatus(9, 10, wednesday).status).toBe("ahead");
    // Target 11, done 4 → 36.4% vs ~35.7% expected → on track.
    expect(activityStatus(4, 11, wednesday).status).toBe("on_track");
    // Target 10, done 2 → 20% vs ~36% expected → behind.
    expect(activityStatus(2, 10, wednesday).status).toBe("behind");
    // Progress never displays above 100%.
    expect(activityStatus(99, 10, wednesday).pct).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// Workspace permission guards (convex/businessAccess — pure guard contract)
// ---------------------------------------------------------------------------

describe("workspace isolation guards", () => {
  const bizA = "biz_a" as never;
  const bizB = "biz_b" as never;

  test("assertBusinessOwns accepts a row from the caller's own business", () => {
    expect(() => assertBusinessOwns({ businessId: bizA }, bizA)).not.toThrow();
  });

  test("assertBusinessOwns rejects another business's row (no cross-business access)", () => {
    expect(() => assertBusinessOwns({ businessId: bizB }, bizA)).toThrow(/Not found in this workspace/);
  });

  test("assertBusinessOwns rejects missing rows (lead visibility)", () => {
    expect(() => assertBusinessOwns(null, bizA)).toThrow(/Not found/);
    expect(() => assertBusinessOwns(undefined, bizA)).toThrow(/Not found/);
  });
});
