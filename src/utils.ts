/**
 * lzw decode 算法
 * 来自 https://github.com/buzzfeed/libgif-js/blob/master/libgif.js#L131
 * @param lzwMinimumCodeSize
 * @param data
 */
export function lzwDecode(lzwMinimumCodeSize: number, data: number[]) {
  // TODO: Now that the GIF parser is a bit different, maybe this should get an array of bytes instead of a String?
  let pos = 0; // Maybe this streaming thing should be merged with the Stream?
  let readCode = function (size: number) {
    let code = 0;
    for (let i = 0; i < size; i++) {
      if (data[pos >> 3] & (1 << (pos & 7))) {
        code |= 1 << i;
      }
      pos++;
    }
    return code;
  };

  let output: number[] = [];

  let clearCode = 1 << lzwMinimumCodeSize;
  let eoiCode = clearCode + 1;

  let codeSize = lzwMinimumCodeSize + 1;

  let dict: Array<number[] | null> = [];

  let clear = function () {
    dict = [];
    codeSize = lzwMinimumCodeSize + 1;
    for (let i = 0; i < clearCode; i++) {
      dict[i] = [i];
    }
    dict[clearCode] = [];
    dict[eoiCode] = null;
  };

  let code: number;
  let last: number;

  while (true) {
    // @ts-ignore
    last = code;
    code = readCode(codeSize);

    if (code === clearCode) {
      clear();
      continue;
    }
    if (code === eoiCode) break;

    if (code < dict.length) {
      if (last !== clearCode) {
        // @ts-ignore
        dict.push(dict[last].concat(dict[code][0]));
      }
    } else {
      if (code !== dict.length) throw new Error('Invalid LZW code.');
      // @ts-ignore
      dict.push(dict[last].concat(dict[last][0]));
    }
    // @ts-ignore
    output.push.apply(output, dict[code]);

    if (dict.length === 1 << codeSize && codeSize < 12) {
      // If we're at the last code and codeSize is 12, the next code will be a clearCode, and it'll be 12 bits long.
      codeSize++;
    }
  }

  // I don't know if this is technically an error, but some GIFs do it.
  //if (Math.ceil(pos / 8) !== data.length) throw new Error('Extraneous LZW bytes.');
  return output;
}
