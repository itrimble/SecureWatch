// src/button.tsx
import React from "react";
import { clsx } from "clsx";
import { jsx, jsxs } from "react/jsx-runtime";
var Button = React.forwardRef(
  ({ className, variant = "primary", size = "md", isLoading = false, children, disabled, ...props }, ref) => {
    return /* @__PURE__ */ jsxs(
      "button",
      {
        className: clsx(
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
          isLoading && /* @__PURE__ */ jsxs("svg", { className: "mr-2 h-4 w-4 animate-spin", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", children: [
            /* @__PURE__ */ jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }),
            /* @__PURE__ */ jsx("path", { className: "opacity-75", fill: "currentColor", d: "m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })
          ] }),
          children
        ]
      }
    );
  }
);
Button.displayName = "Button";

// src/card.tsx
import React2 from "react";
import { clsx as clsx2 } from "clsx";
import { jsx as jsx2 } from "react/jsx-runtime";
var Card = React2.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsx2(
    "div",
    {
      ref,
      className: clsx2("rounded-lg border bg-card text-card-foreground shadow-sm", className),
      ...props
    }
  )
);
Card.displayName = "Card";
var CardHeader = React2.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsx2("div", { ref, className: clsx2("flex flex-col space-y-1.5 p-6", className), ...props })
);
CardHeader.displayName = "CardHeader";
var CardTitle = React2.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsx2("h3", { ref, className: clsx2("text-2xl font-semibold leading-none tracking-tight", className), ...props })
);
CardTitle.displayName = "CardTitle";
var CardContent = React2.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsx2("div", { ref, className: clsx2("p-6 pt-0", className), ...props })
);
CardContent.displayName = "CardContent";

// src/badge.tsx
import React3 from "react";
import { clsx as clsx3 } from "clsx";
import { jsx as jsx3 } from "react/jsx-runtime";
var Badge = React3.forwardRef(
  ({ className, variant = "default", ...props }, ref) => {
    return /* @__PURE__ */ jsx3(
      "div",
      {
        ref,
        className: clsx3(
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
import React4 from "react";
import { clsx as clsx4 } from "clsx";
import { jsx as jsx4 } from "react/jsx-runtime";
var Alert = React4.forwardRef(
  ({ className, variant = "default", ...props }, ref) => /* @__PURE__ */ jsx4(
    "div",
    {
      ref,
      role: "alert",
      className: clsx4(
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
var AlertTitle = React4.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsx4("h5", { ref, className: clsx4("mb-1 font-medium leading-none tracking-tight", className), ...props })
);
AlertTitle.displayName = "AlertTitle";
var AlertDescription = React4.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsx4("div", { ref, className: clsx4("text-sm opacity-90", className), ...props })
);
AlertDescription.displayName = "AlertDescription";
export {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle
};
//# sourceMappingURL=index.mjs.map