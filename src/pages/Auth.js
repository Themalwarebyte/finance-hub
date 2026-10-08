import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot, } from "@/components/ui/input-otp";
import { BrandMark, PRODUCT_NAME } from "@/components/BrandMark";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, Loader2, Mail, UserX } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
function resolveRedirectAfterAuth(returnTo, fallback = "/dashboard") {
    if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
        return returnTo;
    }
    return fallback;
}
function Auth({ redirectAfterAuth } = {}) {
    const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const redirect = resolveRedirectAfterAuth(searchParams.get("returnTo"), redirectAfterAuth);
    const [step, setStep] = useState("signIn");
    const [otp, setOtp] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            navigate(redirect);
        }
    }, [authLoading, isAuthenticated, navigate, redirect]);
    const handleEmailSubmit = async (event) => {
        event.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            const formData = new FormData(event.currentTarget);
            await signIn("email-otp", formData);
            setStep({ email: formData.get("email") });
            setIsLoading(false);
        }
        catch (error) {
            console.error("Email sign-in error:", error);
            setError(error instanceof Error
                ? error.message
                : "Failed to send verification code. Please try again.");
            setIsLoading(false);
        }
    };
    const handleOtpSubmit = async (event) => {
        event.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            const formData = new FormData(event.currentTarget);
            await signIn("email-otp", formData);
            console.log("signed in");
            navigate(redirect);
        }
        catch (error) {
            console.error("OTP verification error:", error);
            setError("The verification code you entered is incorrect.");
            setIsLoading(false);
            setOtp("");
        }
    };
    const handleGuestLogin = async () => {
        setIsLoading(true);
        setError(null);
        try {
            console.log("Attempting anonymous sign in...");
            await signIn("anonymous");
            console.log("Anonymous sign in successful");
            navigate(redirect);
        }
        catch (error) {
            console.error("Guest login error:", error);
            console.error("Error details:", JSON.stringify(error, null, 2));
            setError(`Failed to sign in as guest: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setIsLoading(false);
        }
    };
    return (_jsxs("div", { className: "relative min-h-screen flex flex-col overflow-hidden", children: [_jsx("div", { className: "hero-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" }), _jsx("div", { className: "relative flex-1 flex items-center justify-center px-4", children: _jsx("div", { className: "flex items-center justify-center h-full flex-col", children: _jsxs(Card, { className: "w-full max-w-[400px] pb-0 shadow-[var(--shadow-lift)]", children: [step === "signIn" ? (_jsxs(_Fragment, { children: [_jsxs(CardHeader, { className: "text-center", children: [_jsx("div", { className: "flex justify-center", children: _jsx("button", { type: "button", "aria-label": `${PRODUCT_NAME} home`, onClick: () => navigate("/"), className: "mb-5 mt-2", children: _jsx(BrandMark, { className: "size-12 rounded-2xl" }) }) }), _jsxs(CardTitle, { className: "text-xl tracking-tight", children: ["Welcome to ", PRODUCT_NAME] }), _jsx(CardDescription, { children: "Enter your email to log in or create your workspace" })] }), _jsx("form", { onSubmit: handleEmailSubmit, children: _jsxs(CardContent, { children: [_jsxs("div", { className: "relative flex items-center gap-2", children: [_jsxs("div", { className: "relative flex-1", children: [_jsx(Mail, { className: "absolute left-3 top-3 h-4 w-4 text-muted-foreground" }), _jsx(Input, { name: "email", placeholder: "name@example.com", type: "email", className: "pl-9", disabled: isLoading, required: true })] }), _jsx(Button, { type: "submit", variant: "outline", size: "icon", disabled: isLoading, children: isLoading ? (_jsx(Loader2, { className: "h-4 w-4 animate-spin" })) : (_jsx(ArrowRight, { className: "h-4 w-4" })) })] }), error && (_jsx("p", { className: "mt-2 text-sm text-red-500", children: error })), _jsxs("div", { className: "mt-4", children: [_jsxs("div", { className: "relative", children: [_jsx("div", { className: "absolute inset-0 flex items-center", children: _jsx("span", { className: "w-full border-t" }) }), _jsx("div", { className: "relative flex justify-center text-xs uppercase", children: _jsx("span", { className: "bg-background px-2 text-muted-foreground", children: "Or" }) })] }), _jsxs(Button, { type: "button", variant: "outline", className: "w-full mt-4", onClick: handleGuestLogin, disabled: isLoading, children: [_jsx(UserX, { className: "mr-2 h-4 w-4" }), "Continue as Guest"] })] })] }) })] })) : (_jsxs(_Fragment, { children: [_jsxs(CardHeader, { className: "text-center mt-4", children: [_jsx(CardTitle, { children: "Check your email" }), _jsxs(CardDescription, { children: ["We've sent a code to ", step.email] })] }), _jsxs("form", { onSubmit: handleOtpSubmit, children: [_jsxs(CardContent, { className: "pb-4", children: [_jsx("input", { type: "hidden", name: "email", value: step.email }), _jsx("input", { type: "hidden", name: "code", value: otp }), _jsx("div", { className: "flex justify-center", children: _jsx(InputOTP, { value: otp, onChange: setOtp, maxLength: 6, disabled: isLoading, onKeyDown: (e) => {
                                                                if (e.key === "Enter" && otp.length === 6 && !isLoading) {
                                                                    // Find the closest form and submit it
                                                                    const form = e.target.closest("form");
                                                                    if (form) {
                                                                        form.requestSubmit();
                                                                    }
                                                                }
                                                            }, children: _jsx(InputOTPGroup, { children: Array.from({ length: 6 }).map((_, index) => (_jsx(InputOTPSlot, { index: index }, index))) }) }) }), error && (_jsx("p", { className: "mt-2 text-sm text-red-500 text-center", children: error })), _jsxs("p", { className: "text-sm text-muted-foreground text-center mt-4", children: ["Didn't receive a code?", " ", _jsx(Button, { variant: "link", className: "p-0 h-auto", onClick: () => setStep("signIn"), children: "Try again" })] })] }), _jsxs(CardFooter, { className: "flex-col gap-2", children: [_jsx(Button, { type: "submit", className: "w-full", disabled: isLoading || otp.length !== 6, children: isLoading ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }), "Verifying..."] })) : (_jsxs(_Fragment, { children: ["Verify code", _jsx(ArrowRight, { className: "ml-2 h-4 w-4" })] })) }), _jsx(Button, { type: "button", variant: "ghost", onClick: () => setStep("signIn"), disabled: isLoading, className: "w-full", children: "Use different email" })] })] })] })), _jsxs("div", { className: "py-4 px-6 text-xs text-center text-muted-foreground bg-muted/60 border-t rounded-b-lg", children: ["Secured by", " ", _jsx("a", { href: "https://freebuff.com", target: "_blank", rel: "noopener noreferrer", className: "underline hover:text-primary transition-colors", children: "freebuff.com" })] })] }) }) })] }));
}
export default function AuthPage(props) {
    return (_jsx(Suspense, { children: _jsx(Auth, { ...props }) }));
}
