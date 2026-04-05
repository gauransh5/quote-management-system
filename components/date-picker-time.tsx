"use client";

/**
 * Date + time picker using shadcn Calendar and Popover (date) and native time input.
 * Used for schedule rows on the quote detail page.
 * @see https://ui.shadcn.com/docs/components/radix/date-picker#time-picker
 */
import * as React from "react";
import { format, parse, startOfDay } from "date-fns";
import { ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface DatePickerTimeProps {
  /** Date in YYYY-MM-DD (empty string when none) */
  date: string;
  /** Time in HH:mm (empty string when none) */
  time: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  dateLabel?: string;
  timeLabel?: string;
  /** Disable dates before this (e.g. startOfDay(new Date()) to disable past) */
  minDate?: Date;
  disabled?: boolean;
  className?: string;
}

export function DatePickerTime({
  date,
  time,
  onDateChange,
  onTimeChange,
  dateLabel = "Date",
  timeLabel = "Time",
  minDate,
  disabled = false,
  className,
}: DatePickerTimeProps) {
  const [open, setOpen] = React.useState(false);

  const dateObj = date
    ? parse(date, "yyyy-MM-dd", new Date())
    : undefined;
  const isValidDate = dateObj && !isNaN(dateObj.getTime());

  return (
    <div className={className}>
      <div className="flex flex-row items-end gap-2 flex-wrap">
        <div className="flex flex-col gap-1.5 min-w-0">
          <Label htmlFor={`date-${dateLabel}-${timeLabel}`} className="text-xs text-muted-foreground">
            {dateLabel}
          </Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                id={`date-${dateLabel}-${timeLabel}`}
                className="h-8 w-full min-w-[7rem] justify-between font-normal text-xs"
                disabled={disabled}
              >
                {isValidDate ? format(dateObj, "PPP") : "Select date"}
                <ChevronDownIcon className="size-3.5 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto overflow-hidden p-0" align="start">
              <Calendar
                mode="single"
                selected={isValidDate ? dateObj : undefined}
                captionLayout="dropdown"
                defaultMonth={isValidDate ? dateObj : undefined}
                disabled={minDate ? { before: minDate } : undefined}
                onSelect={(d) => {
                  if (d) {
                    onDateChange(format(d, "yyyy-MM-dd"));
                    setOpen(false);
                  }
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex flex-col gap-1.5 w-28">
          <Label htmlFor={`time-${dateLabel}-${timeLabel}`} className="text-xs text-muted-foreground">
            {timeLabel}
          </Label>
          <Input
            type="time"
            id={`time-${dateLabel}-${timeLabel}`}
            value={time}
            onChange={(e) => onTimeChange(e.target.value)}
            disabled={disabled}
            className="h-8 text-xs appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
          />
        </div>
      </div>
    </div>
  );
}

/** Start of today — use as minDate to disable past dates */
export function getTodayStart(): Date {
  return startOfDay(new Date());
}
