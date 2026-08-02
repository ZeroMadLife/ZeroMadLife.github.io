<script module lang="ts">
import { addCollection } from "@iconify/svelte/dist/OfflineIcon.svelte";
// @ts-expect-error virtual module is provided by the local-svelte-icons plugin.
import collections from "virtual:local-svelte-icons";

for (const collection of Object.values(collections)) {
	addCollection(collection);
}
</script>

<script lang="ts">
import OfflineIcon from "@iconify/svelte/dist/OfflineIcon.svelte";
import type { ComponentProps } from "svelte";

type Props = ComponentProps<typeof OfflineIcon>;

let { icon, ...props }: Props = $props();
</script>

<OfflineIcon {icon} {...props} />
