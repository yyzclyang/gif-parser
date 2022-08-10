class GifStream {
  private index = 0;
  private readonly length: number;
  private readonly data: Uint8Array;

  constructor(arrayBuffer: ArrayBuffer) {
    this.data = new Uint8Array(arrayBuffer);
    this.length = this.data.length;
  }

  readByte() {
    if (this.index >= this.length) {
      throw new Error('Attempted to read past end of stream.');
    }

    return this.data[this.index++];
  }

  readBytes(n: number) {
    const bytes = [];
    for (let i = 0; i < n; i++) {
      bytes.push(this.readByte());
    }
    return bytes;
  }

  readAsString(n: number) {
    let s = '';
    for (let i = 0; i < n; i++) {
      s += String.fromCharCode(this.readByte());
    }
    return s;
  }

  readUnsigned() {
    // gif 是小端序
    let bytes = this.readBytes(2);
    return (bytes[1] << 8) + bytes[0];
  }
}

export default GifStream;
