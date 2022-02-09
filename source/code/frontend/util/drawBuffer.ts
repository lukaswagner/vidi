export function drawBuffer(gl: WebGL2RenderingContext, buf: GLuint): void {
    if (
        buf >= gl.COLOR_ATTACHMENT1 &&
        buf <= gl.COLOR_ATTACHMENT15
    ) {
        const offset = buf - gl.COLOR_ATTACHMENT0;
        const drawBuffers = new Array(offset + 1).fill(gl.NONE);
        drawBuffers[offset] = buf;
        gl.drawBuffers(drawBuffers);
    } else {
        gl.drawBuffers([buf]);
    }
}

export function drawBuffers(gl: WebGL2RenderingContext, mask: number): void {
    const buf = [...new Array(gl.getParameter(gl.MAX_DRAW_BUFFERS))]
        .map((_, i) => (mask >> i) & 1 ? gl.COLOR_ATTACHMENT0 + i : gl.NONE);
    gl.drawBuffers(buf);
}
