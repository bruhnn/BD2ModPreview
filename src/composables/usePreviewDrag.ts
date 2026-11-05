import { onUnmounted, ref } from "vue";
import { usePreviewerStore } from "../stores/previewer";

export type PreviewDropTarget = {
	row: number;
	column: number;
	newRow: boolean;
	previewId?: string;
};

export function usePreviewDrag(
	onDrop: (target: PreviewDropTarget) => void,
	fillEmpty = false,
) {
	const previewerStore = usePreviewerStore();

	const isDragging = ref(false);
	const hasDragged = ref(false);

	const dragPosition = ref({ x: 0, y: 0 });

	let dragStart = { x: 0, y: 0 };
	let dropSpace: {
		element: HTMLElement;
		margin: "marginLeft" | "marginRight" | "marginTop" | "marginBottom";
		value: string;
	} | null = null;

	function clearDropSpace() {
		if (!dropSpace) return;

		dropSpace.element.style[dropSpace.margin] = dropSpace.value;
		dropSpace = null;
	}

	function cancelDrag() {
		clearDropSpace();

		isDragging.value = false;
		dropTarget.value = null;
	}

	onUnmounted(clearDropSpace);

	const dropTarget = ref<{
		row: number;
		column: number;
		newRow: boolean;
		previewId?: string;
		left: number;
		top: number;
		width: number;
		height: number;
	} | null>(null);

	function startDrag(event: PointerEvent) {
		if (event.button !== 0) return;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		dragStart = { x: event.clientX, y: event.clientY };
		hasDragged.value = false;
		isDragging.value = true;
	}

	function moveDrag(
		event: Pick<PointerEvent, "clientX" | "clientY">,
		external = false,
	) {
		if (external) isDragging.value = true;
		if (!isDragging.value) return;
		dragPosition.value = { x: event.clientX, y: event.clientY };
		clearDropSpace();
		dropTarget.value = null;
		if (
			!external &&
			Math.hypot(
				event.clientX - dragStart.x,
				event.clientY - dragStart.y,
			) < 5
		)
			return;
		hasDragged.value = true;
		const grid =
			document.querySelector("#preview-grid") ||
			document.querySelector("#content");
		if (!grid) return;
		const bounds = grid.getBoundingClientRect();
		const { clientX: x, clientY: y } = event;
		if (
			x < bounds.left ||
			x > bounds.right ||
			y < bounds.top ||
			y > bounds.bottom
		)
			return;
		if (fillEmpty) {
			for (const tile of grid.querySelectorAll<HTMLElement>(
				"[data-preview-id]",
			)) {
				const preview = previewerStore.getPreview(
					tile.dataset.previewId!,
				);
				const rect = tile.getBoundingClientRect();
				if (
					preview &&
					!preview.source &&
					x >= rect.left &&
					x <= rect.right &&
					y >= rect.top &&
					y <= rect.bottom
				) {
					dropTarget.value = {
						...preview.pos,
						newRow: false,
						previewId: preview.id,
						left: rect.left,
						top: rect.top,
						width: rect.width,
						height: rect.height,
					};
					return;
				}
			}
		}
		const rows = Array.from(
			grid.querySelectorAll<HTMLElement>(":scope > .preview-row"),
		);
		if (!rows.length) {
			dropTarget.value = {
				row: 0,
				column: 0,
				newRow: true,
				left: bounds.left + 8,
				top: bounds.top + bounds.height / 2 - 16,
				width: bounds.width - 16,
				height: 32,
			};
			return;
		}
		for (const element of rows) {
			const rect = element.getBoundingClientRect();
			if (y < rect.top - 8 || y > rect.bottom + 8) continue;
			const cells = Array.from(
				element.querySelectorAll<HTMLElement>(":scope > .preview-cell"),
			);
			const id =
				cells[0].querySelector<HTMLElement>("[data-preview-id]")!
					.dataset.previewId!;
			const row = previewerStore.getPreview(id)!.pos.row;
			if (
				Math.abs(y - rect.top) <= 24 ||
				Math.abs(y - rect.bottom) <= 24
			) {
				const before =
					Math.abs(y - rect.top) <= Math.abs(y - rect.bottom);
				// nboth sides of a row gap use the top of the lower row
				const nextRow = rows[rows.indexOf(element) + 1];
				const target = !before && nextRow ? nextRow : element;
				const targetBounds = target.getBoundingClientRect();
				const margin = before || nextRow ? "marginTop" : "marginBottom";
				dropSpace = {
					element: target,
					margin,
					value: target.style[margin],
				};
				target.style[margin] = "40px";
				dropTarget.value = {
					row: before ? row : row + 1,
					column: 0,
					newRow: true,
					left: targetBounds.left,
					top:
						margin === "marginTop"
							? targetBounds.top
							: targetBounds.bottom - 32,
					width: targetBounds.width,
					height: 32,
				};
				return;
			}
			const edges = [
				rect.left,
				...cells.map((cell) => cell.getBoundingClientRect().right),
			];
			const column = edges.reduce(
				(nearest, edge, index) =>
					Math.abs(x - edge) < Math.abs(x - edges[nearest])
						? index
						: nearest,
				0,
			);
			const cell =
				column === cells.length ? cells[column - 1] : cells[column];
			const margin =
				column === cells.length ? "marginRight" : "marginLeft";
			const cellBounds = cell.getBoundingClientRect();
			dropSpace = { element: cell, margin, value: cell.style[margin] };
			cell.style[margin] = "40px";
			dropTarget.value = {
				row,
				column,
				newRow: false,
				left:
					column === cells.length
						? cellBounds.right - 32
						: cellBounds.left,
				top: rect.top,
				width: 32,
				height: rect.height,
			};
			return;
		}
	}

	function finishDrag(event: PointerEvent) {
		if (!isDragging.value) return;
		moveDrag(event);
		clearDropSpace();
		if (dropTarget.value) {
			onDrop(dropTarget.value);
		}
		isDragging.value = false;
		dropTarget.value = null;
	}

	return {
		isDragging,
		hasDragged,
		dragPosition,
		dropTarget,
		startDrag,
		moveDrag,
		finishDrag,
		cancelDrag,
	};
}
