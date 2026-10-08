import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { motion } from "framer-motion";
export default function NotFound() {
    return (_jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.5 }, className: "min-h-screen flex flex-col", children: _jsx("div", { className: "flex-1 flex flex-col items-center justify-center", children: _jsx("div", { className: "max-w-5xl mx-auto relative px-4", children: _jsx("div", { className: "flex items-center justify-center min-h-[200px]", children: _jsxs("div", { className: "text-center", children: [_jsx("h1", { className: "text-4xl font-bold text-gray-900 mb-4", children: "404" }), _jsx("p", { className: "text-lg text-gray-600", children: "Page Not Found" })] }) }) }) }) }));
}
