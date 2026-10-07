import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";
import { cn } from "./utils";
import { buttonVariants } from "./button";
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const defaults = getDefaultClassNames();
  return (
    <DayPicker
      {...props}
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        ...defaults,
        months: "relative flex flex-col sm:flex-row gap-4",
        month_caption: "flex justify-center h-9 items-center",
        caption_label: "text-sm font-medium",
        nav: "absolute inset-x-0 top-0 flex justify-between",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "size-8 p-0",
        ),
        button_next: cn(buttonVariants({ variant: "outline" }), "size-8 p-0"),
        month_grid: "border-collapse",
        weekday: "text-muted-foreground text-xs font-normal size-9",
        day: "size-9 text-center",
        day_button: cn(buttonVariants({ variant: "ghost" }), "size-9 p-0"),
        selected: "bg-primary text-primary-foreground rounded-md",
        today: "bg-accent rounded-md",
        outside: "text-muted-foreground opacity-50",
        disabled: "text-muted-foreground opacity-50",
        range_middle: "bg-accent",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className }) =>
          orientation === "left" ? (
            <ChevronLeft className={cn("size-4", className)} />
          ) : (
            <ChevronRight className={cn("size-4", className)} />
          ),
        ...components,
      }}
    />
  );
}
export { Calendar };
