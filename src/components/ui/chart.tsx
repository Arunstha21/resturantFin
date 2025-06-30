"use client"

import * as React from "react"
import * as RechartsPrimitive from "recharts"
import { cn } from "@/lib/utils"

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: Record<string, { color?: string }>
    children: React.ReactElement
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`

  return (
    <div
      data-chart={chartId}
      ref={ref}
      className={cn(
        "flex aspect-video justify-center text-xs",
        className
      )}
      {...props}
    >
      <ChartStyle id={chartId} config={config} />
      {React.isValidElement(children) ? (
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      ) : null}
    </div>
  )
})
ChartContainer.displayName = "ChartContainer"

const ChartStyle = ({ id, config }: { id: string; config: Record<string, any> }) => {
  const colorConfig = Object.entries(config).filter(([, c]) => c.color)
  if (!colorConfig.length) return null

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
[data-chart='${id}'] {
  ${colorConfig.map(([key, c]) => `--color-${key}: ${c.color};`).join("\n")}
}
        `,
      }}
    />
  )
}

// ChartTooltip wraps the actual Tooltip
const ChartTooltip = (props: React.ComponentProps<typeof RechartsPrimitive.Tooltip>) => {
  return <RechartsPrimitive.Tooltip {...props} />
}

const ChartTooltipContent = ({
  active,
  payload,
  label,
  labelFormatter,
  formatter,
  className,
}: {
  active?: boolean
  payload?: any[]
  label?: string
  labelFormatter?: (label: any, payload: any) => React.ReactNode
  formatter?: (value: any, name: any) => [React.ReactNode, string]
  className?: string
}) => {
  if (!active || !payload?.length) return null

  return (
    <div
      className={cn(
        "rounded-md border bg-background px-3 py-2 text-xs shadow-md min-w-[200px]",
        className
      )}
    >
      {label && (
        <div className="font-medium mb-1">
          {labelFormatter ? labelFormatter(label, payload) : label}
        </div>
      )}
      <div className="space-y-1">
        {payload.map((entry, idx) => {
          const [formattedValue, name] = formatter
            ? formatter(entry.value, entry.name)
            : [entry.value, entry.name]

          return (
            <div key={idx} className="flex items-center justify-between text-muted-foreground">
              <span>{name}</span>
              <span className="font-mono tabular-nums text-foreground">{formattedValue}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartStyle }