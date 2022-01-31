function toggle(elemId: string, Id: string, elements?: HTMLDivElement[]): void {
    const elem = document.getElementById(elemId) as HTMLDivElement;
    elements?.push(elem);
    const toggle = document.getElementById(Id) as HTMLDivElement;
    if (!elem || !toggle) return;
    toggle.onclick = () => {
        elem.classList.toggle('d-none');
        elements?.forEach((e) => {
            if(e !== elem && !e.classList.contains('d-none')) {
                e.classList.add('d-none');
            }
        });
    };
}

const mainElements: HTMLDivElement[] = [];

toggle('controls-container', 'control-toggle', mainElements);
toggle('info-container', 'info-toggle', mainElements);

toggle('preset-group', 'preset-header',);
toggle('data-group', 'data-header',);
toggle('custom-data-group', 'custom-data-header',);
toggle('position-group', 'position-header',);
toggle('cluster-group', 'cluster-header',);
toggle('size-group', 'size-header',);
toggle('color-group', 'color-header',);
