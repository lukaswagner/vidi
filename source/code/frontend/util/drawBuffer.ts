export function drawBuffer(gl: WebGL2RenderingContext, buf: GLuint): GLuint[] {
    if (
        buf >= gl.COLOR_ATTACHMENT1 &&
        buf <= gl.COLOR_ATTACHMENT15
    ) {
        const offset = buf - gl.COLOR_ATTACHMENT0;
        const drawBuffers = new Array(offset + 1).fill(gl.NONE);
        drawBuffers[offset] = buf;
        return drawBuffers;
    } else {
        return [buf];
    }
}
