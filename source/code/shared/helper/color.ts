import { GLclampf3, RGBA } from 'shared/types/tuples';

// excerpt from webgl-operate
// https://github.com/cginternals/webgl-operate/blob/master/source/color.ts

const DEFAULT_ALPHA: GLclampf = 1.0;
const HEX_FORMAT_REGEX =
    new RegExp(/^(#|0x)?(([0-9a-f]{3}){1,2}|([0-9a-f]{4}){1,2})$/i);

/**
 * Converts a color from HEX string to RGBA space. The hex string can start
 * with '#' or '0x' or neither of these.
 * @param hex - Hexadecimal color string: red, green, and blue,
 * each in ['00', 'ff'].
 * @returns - RGBA color tuple: red, green, blue, and alpha,
 * each in [0.0, 1.0]. On error [0, 0, 0, 0] is returned.
 */
export function hex2rgba(hex: string): RGBA {
    const rgba: RGBA = [0.0, 0.0, 0.0, DEFAULT_ALPHA];

    if (!HEX_FORMAT_REGEX.test(hex)) {
        console.warn('hexadecimal RGBA color string must conform to either',
            '0x0000, #0000, 0000, 0x00000000, #00000000, or 00000000, given',
            hex);
        return rgba;
    }

    const offset = hex.startsWith('0x') ? 2 : hex.startsWith('#') ? 1 : 0;
    const length = Math.floor((hex.length - offset) / 3);
    const stride = length - 1;

    rgba[0] = parseInt(
        hex[offset + 0 * length] +
        hex[offset + 0 * length + stride], 16) / 255.0;
    rgba[1] = parseInt(
        hex[offset + 1 * length] +
        hex[offset + 1 * length + stride], 16) / 255.0;
    rgba[2] = parseInt(
        hex[offset + 2 * length] +
        hex[offset + 2 * length + stride], 16) / 255.0;
    if ((hex.length - offset) === 4 || (hex.length - offset) === 8) {
        rgba[3] = parseInt(
            hex[offset + 3 * length] +
            hex[offset + 3 * length + stride], 16) / 255.0;
    }

    if(isNaN(rgba[0]) || isNaN(rgba[1]) || isNaN(rgba[2]) || isNaN(rgba[3])){
        console.warn(
            `expected well formated hexadecimal RGBA string, given '${hex}'`);
    }
    return rgba;
}

/**
 * Converts a color from HSL space to RGB space.
 * @param hsl - HSL color tuple: hue, saturation, and lightness,
 * each in [0.0, 1.0].
 * @returns - RGB color tuple: red, green, and blue, each in [0.0, 1.0].
 */
export function hsl2rgb(hsl: GLclampf3): GLclampf3 {
    if (hsl[1] === 0.0) {
        return [hsl[2], hsl[2], hsl[2]];
    }

    const q = hsl[2] < 0.5 ?
        hsl[2] * (1.0 + hsl[1]) :
        (hsl[2] + hsl[1]) - (hsl[1] * hsl[2]);
    const p = 2.0 * hsl[2] - q;

    return [
        hue2rgb(p, q, hsl[0] + (1.0 / 3.0)),
        hue2rgb(p, q, hsl[0]),
        hue2rgb(p, q, hsl[0] - (1.0 / 3.0))
    ];
}

/**
 * Converts a hue value into an rgb value.
 */
function hue2rgb(p: GLfloat, q: GLfloat, t: GLfloat): GLfloat {
    if (t < 0.0) {
        t += 1.0;
    } else if (t > 1.0) {
        t -= 1.0;
    }

    if ((6.0 * t) < 1.0) {
        return p + (q - p) * 6.0 * t;
    }
    if ((2.0 * t) < 1.0) {
        return q;
    }
    if ((3.0 * t) < 2.0) {
        return p + (q - p) * 6.0 * (2.0 / 3.0 - t);
    }
    return p;
}
