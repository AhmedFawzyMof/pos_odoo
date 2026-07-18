<script lang="ts">
import type { HTMLAttributes } from "vue"
import type { ChartConfig } from "."
import { useId } from "reka-ui"
import { computed, toRefs } from "vue"
import { cn } from "@/lib/utils"
import { provideChartContext } from "."
import ChartStyle from "./ChartStyle.vue"
</script>

<script setup lang="ts">
const props = defineProps<{
  id?: HTMLAttributes["id"]
  class?: HTMLAttributes["class"]
  config: ChartConfig
}>()

defineSlots<{
  default: {
    id: string
    config: ChartConfig
  }
}>()

const { config } = toRefs(props)
const uniqueId = useId()
const chartId = computed(() => `chart-${props.id || uniqueId.replace(/:/g, "")}`)

provideChartContext({
  id: uniqueId,
  config,
})
</script>

<template>
  <div
    data-slot="chart"
    :data-chart="chartId"
    :class="cn(
      `flex flex-col justify-center text-xs w-full`,
      props.class,
    )"
  >
    <slot :id="uniqueId" :config="config" />
    <ChartStyle :id="chartId" />
  </div>
</template>
