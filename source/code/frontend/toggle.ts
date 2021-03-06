function toggle(
    elemId: string, Id: string, elements?: HTMLDivElement[],
    triangle = true, initFolded = false
): void {
    const elem = document.getElementById(elemId) as HTMLDivElement;
    elements?.push(elem);
    const toggle = document.getElementById(Id) as HTMLDivElement;
    if (!elem || !toggle) return;
    if (triangle) toggle.classList.add('triangle-down');
    toggle.onclick = () => {
        if (triangle) {
            toggle.classList.toggle('triangle-down');
            toggle.classList.toggle('triangle-right');
        }
        elem.classList.toggle('d-none');
        elements?.forEach((e) => {
            if(e !== elem && !e.classList.contains('d-none')) {
                e.classList.add('d-none');
            }
        });
    };
    if (initFolded) toggle.click();
}

const mainElements: HTMLDivElement[] = [];

toggle(
    'controls-container', 'control-toggle',
    mainElements, false, window.opener);
toggle('info-container', 'info-toggle', mainElements, false);

toggle('preset-group', 'preset-header');
toggle('data-group', 'data-header', undefined, undefined, true);
toggle('custom-data-group', 'custom-data-header', undefined, undefined, true);
toggle('position-group', 'position-header');
toggle('grid-group', 'grid-header');
toggle('selection-group', 'selection-header', undefined, undefined, true);
toggle('cluster-group', 'cluster-header', undefined, undefined, true);
toggle('size-group', 'size-header', undefined, undefined, true);
toggle('color-group', 'color-header', undefined, undefined, true);
toggle('rendering-group', 'rendering-header');
toggle('debug-group', 'debug-header', undefined, undefined, true);
