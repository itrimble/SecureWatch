"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  Alert: () => Alert,
  AlertDescription: () => AlertDescription,
  AlertTitle: () => AlertTitle,
  Badge: () => Badge,
  Button: () => Button,
  Card: () => Card,
  CardContent: () => CardContent,
  CardHeader: () => CardHeader,
  CardTitle: () => CardTitle
});
module.exports = __toCommonJS(index_exports);

// src/button.tsx
var import_react = __toESM(require("react"));
var import_clsx = require("clsx");
var import_jsx_runtime = require("react/jsx-runtime");
var Button = import_react.default.forwardRef(
  ({ className, variant = "primary", size = "md", isLoading = false, children, disabled, ...props }, ref) => {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "button",
      {
        className: (0, import_clsx.clsx)(
          "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
          {
            "bg-primary text-primary-foreground hover:bg-primary/90": variant === "primary",
            "bg-secondary text-secondary-foreground hover:bg-secondary/80": variant === "secondary",
            "bg-destructive text-destructive-foreground hover:bg-destructive/90": variant === "danger",
            "hover:bg-accent hover:text-accent-foreground": variant === "ghost",
            "h-9 px-3 text-sm": size === "sm",
            "h-10 px-4 py-2": size === "md",
            "h-11 px-8 text-lg": size === "lg"
          },
          className
        ),
        ref,
        disabled: disabled || isLoading,
        ...props,
        children: [
          isLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { className: "mr-2 h-4 w-4 animate-spin", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { className: "opacity-75", fill: "currentColor", d: "m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })
          ] }),
          children
        ]
      }
    );
  }
);
Button.displayName = "Button";

// src/card.tsx
var import_react2 = __toESM(require("react"));
var import_clsx2 = require("clsx");
var import_jsx_runtime2 = require("react/jsx-runtime");
var Card = import_react2.default.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
    "div",
    {
      ref,
      className: (0, import_clsx2.clsx)("rounded-lg border bg-card text-card-foreground shadow-sm", className),
      ...props
    }
  )
);
Card.displayName = "Card";
var CardHeader = import_react2.default.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { ref, className: (0, import_clsx2.clsx)("flex flex-col space-y-1.5 p-6", className), ...props })
);
CardHeader.displayName = "CardHeader";
var CardTitle = import_react2.default.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h3", { ref, className: (0, import_clsx2.clsx)("text-2xl font-semibold leading-none tracking-tight", className), ...props })
);
CardTitle.displayName = "CardTitle";
var CardContent = import_react2.default.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { ref, className: (0, import_clsx2.clsx)("p-6 pt-0", className), ...props })
);
CardContent.displayName = "CardContent";

// src/badge.tsx
var import_react3 = __toESM(require("react"));
var import_clsx3 = require("clsx");
var import_jsx_runtime3 = require("react/jsx-runtime");
var Badge = import_react3.default.forwardRef(
  ({ className, variant = "default", ...props }, ref) => {
    return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      "div",
      {
        ref,
        className: (0, import_clsx3.clsx)(
          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          {
            "border-transparent bg-primary text-primary-foreground hover:bg-primary/80": variant === "default",
            "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80": variant === "secondary",
            "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80": variant === "destructive",
            "text-foreground": variant === "outline",
            "border-transparent bg-green-500 text-white hover:bg-green-600": variant === "success",
            "border-transparent bg-yellow-500 text-white hover:bg-yellow-600": variant === "warning"
          },
          className
        ),
        ...props
      }
    );
  }
);
Badge.displayName = "Badge";

// src/alert.tsx
var import_react4 = __toESM(require("react"));
var import_clsx4 = require("clsx");
var import_jsx_runtime4 = require("react/jsx-runtime");
var Alert = import_react4.default.forwardRef(
  ({ className, variant = "default", ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
    "div",
    {
      ref,
      role: "alert",
      className: (0, import_clsx4.clsx)(
        "relative w-full rounded-lg border p-4",
        {
          "bg-background text-foreground": variant === "default",
          "border-destructive/50 text-destructive dark:border-destructive": variant === "destructive",
          "border-yellow-500/50 text-yellow-600 bg-yellow-50 dark:bg-yellow-900/10": variant === "warning",
          "border-green-500/50 text-green-600 bg-green-50 dark:bg-green-900/10": variant === "success"
        },
        className
      ),
      ...props
    }
  )
);
Alert.displayName = "Alert";
var AlertTitle = import_react4.default.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("h5", { ref, className: (0, import_clsx4.clsx)("mb-1 font-medium leading-none tracking-tight", className), ...props })
);
AlertTitle.displayName = "AlertTitle";
var AlertDescription = import_react4.default.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { ref, className: (0, import_clsx4.clsx)("text-sm opacity-90", className), ...props })
);
AlertDescription.displayName = "AlertDescription";
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle
});
//# sourceMappingURL=index.js.map