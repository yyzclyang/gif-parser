import GifStream from './stream';
import { lzwDecode } from './utils';
import type { Frame, Gif } from './types';

function GifParser(arrayBuffer: ArrayBuffer): Gif {
  const stream = new GifStream(arrayBuffer);

  // Header
  const signature = stream.readAsString(3);
  if (signature !== 'GIF') {
    throw new Error('Not a GIF file.');
  }
  /**
   * gif 版本
   */
  const version = stream.readAsString(3);

  // Logical Screen Descriptor
  /**
   * gif 宽
   */
  const width = stream.readUnsigned();
  /**
   * gif 高
   */
  const height = stream.readUnsigned();

  const globalColorTableInfo = stream.readByte();
  /**
   * 是否存在全局色彩表
   * 1: 存在
   * 0: 不存在
   */
  const globalColorTableFlag = globalColorTableInfo >>> 7;
  /**
   * 图像原色的位数，值需要 +1
   * 比如 0b111 时值为 7，+1 之后为 8，表示图像颜色用 8 bits 表示，即熟悉的 RGB
   */
  const colorResolution = (globalColorTableInfo >>> 4) & 7;
  /**
   * 是否对全局色彩表进行了排序
   * 1: 排序了
   * 0: 没排序
   */
  const sortFlag = (globalColorTableInfo >>> 3) & 1;
  /**
   * 全局色彩表的大小
   * 值 +1 后作为 2 的幂，计算出来代表色彩表的长度
   * 例如 0b111 为 7，+1 之后为 8，2^8 为 256，即色彩表的长度为 256
   */
  const globalColorTableSize = (globalColorTableInfo >>> 0) & 7;
  /**
   * gif 透明区域的背景色索引
   * 如果 Global Color Table Flag 是 0，这个字段应为 0 并且被忽视
   */
  const backgroundColorIndex = stream.readByte();
  /**
   * 像素的宽高比
   * 如果值为 0，则根据以下公式来计算
   * Aspect Ratio = (Pixel Aspect Ratio + 15) / 64
   */
  const pixelAspectRatio = stream.readByte();

  // Global Color Table
  let globalColorTable: number[] | undefined;
  if (globalColorTableFlag === 1) {
    const globalColorTableLength = 3 * (1 << (globalColorTableSize + 1));
    globalColorTable = stream.readBytes(globalColorTableLength);
  }

  /**
   * 解析 block data
   * 这类数据块有个特点
   * 在一个数据块中，第一个 byte 的数字代表接下来多长 byte 的数据是 data
   * 如果长度为 0，代表本次数据块结束了
   */
  const parseDataSubBlocks = () => {
    const data: number[] = [];
    const parseDataBlock = () => {
      const subBlockLength = stream.readByte();
      if (subBlockLength !== 0x00) {
        const subBlockData = stream.readBytes(subBlockLength);
        data.push(...subBlockData);
        parseDataBlock();
      }
    };
    parseDataBlock();

    return data;
  };

  // 帧图像的像素数据
  const pixelData = new Uint8Array(width * height * 4);
  // 图像数据
  const parseFrameImage = () => {
    // Image Descriptor
    /**
     * 当前帧图像的左偏移像素值
     */
    const imageLeftPosition = stream.readUnsigned();
    /**
     * 当前帧图像的上偏移像素值
     */
    const imageTopPosition = stream.readUnsigned();
    /**
     * 当前帧图像的宽度
     */
    const imageWidth = stream.readUnsigned();
    /**
     * 当前帧图像的高度
     */
    const imageHeight = stream.readUnsigned();

    const imagePackedFields = stream.readByte();
    /**
     * 是否存在局部色彩表
     * 1: 存在
     * 0: 不存在
     */
    const localColorTableFlag = imagePackedFields >>> 7;
    /**
     * 帧图片是否为隔行扫描
     * 1: 是
     * 0: 否
     */
    const interlaceFlag = (imagePackedFields >>> 6) & 1;
    /**
     * 局部色彩表是否排序了
     * 1: 排序了
     * 0: 没排序
     */
    const sortFlag = (imagePackedFields >>> 5) & 1;
    /**
     * 保留字段
     */
    const bitsReversed = imagePackedFields >>> 3 && 3;
    /**
     * 局部色彩表的长度
     * 值 +1 后作为 2 的幂，结果为局部色彩表的长度
     */
    const localColorTableSize = imagePackedFields & 7;

    // Local Color Table
    let localColorTable: number[] | undefined;
    if (localColorTableFlag === 1) {
      const localColorTableLength = 3 * (1 << (localColorTableSize + 1));
      localColorTable = stream.readBytes(localColorTableLength);
    }

    // Table Based Image Data
    /**
     * lzw 压缩里，初始字节数
     */
    const lzwMinimumCodeSize = stream.readByte();
    /**
     * 帧图片原始数据
     */
    const imageData = parseDataSubBlocks();
    /**
     * lzw decode 之后的 image data
     */
    const lzwDecodeImageData = lzwDecode(lzwMinimumCodeSize, imageData);

    // parse color table
    /**
     * 帧图像使用的色彩表
     */
    const colorTable = (localColorTable ?? globalColorTable) as number[];
    /**
     * 当图像是隔行扫描模式时，图像每一行的数据在数据流里面的排布是这样
     * 0 8 16 … 4 12 … 2 6 10 14 18 … 1 3 5 7 9 11 13 15 17 19 …
     * 第 0 行数据是图像第 0 行的
     * 第 1 行数据是图像第 8 行的
     * 第 2 行数据是图像第 16 行的
     */
    const pixelDataRowIndexList: number[] = [];
    if (interlaceFlag) {
      // 隔行扫描
      for (let row = 0; row < imageHeight; row += 8) pixelDataRowIndexList.push(row);
      for (let row = 4; row < imageHeight; row += 8) pixelDataRowIndexList.push(row);
      for (let row = 2; row < imageHeight; row += 4) pixelDataRowIndexList.push(row);
      for (let row = 1; row < imageHeight; row += 2) pixelDataRowIndexList.push(row);
    } else {
      for (let row = 0; row < imageHeight; row++) pixelDataRowIndexList.push(row);
    }

    for (let row = 0; row < imageHeight; row++) {
      // 数据流里当前行的数据对应图像的行数
      const pixelDataRowIndex = pixelDataRowIndexList[row];
      for (let col = 0; col < imageWidth; col++) {
        /**
         * 当前像素点的颜色在色彩表中的索引
         * 色彩表是 RGBRGBRGB… 排列的，3 位表示一个像素点的色彩
         */
        const pixelColorIndex = lzwDecodeImageData[imageWidth * row + col];
        // 当前像素不是透明
        if (pixelColorIndex !== frame.transparencyIndex) {
          /**
           * 当前帧该像素点的索引
           * 当前帧的宽高可能小于 gif 的宽高，有上和左方向上的偏移
           * << 2 相当于 * 4
           */
          const pixelDataIndex =
            ((pixelDataRowIndex + imageTopPosition) * width + imageLeftPosition + col) << 2;
          pixelData[pixelDataIndex] = colorTable[pixelColorIndex * 3];
          pixelData[pixelDataIndex + 1] = colorTable[pixelColorIndex * 3 + 1];
          pixelData[pixelDataIndex + 2] = colorTable[pixelColorIndex * 3 + 2];
          pixelData[pixelDataIndex + 3] = 255;
        }
      }
    }

    frame = {
      ...frame,
      xOffset: imageLeftPosition,
      yOffset: imageTopPosition,
      width: imageWidth,
      height: imageHeight,
      data: lzwDecodeImageData,
      pixelData: new Uint8ClampedArray(pixelData),
      interlaceFlag,
      sortFlag,
      bitsReversed,
      colorTable,
    };

    if (frame.disposalMethod === 2) {
      // 将当前帧图像范围填充为透明
      for (let row = 0; row < imageHeight; row++) {
        const startIndex = ((row + imageTopPosition) * width + imageLeftPosition) * 4;
        pixelData.fill(0, startIndex, startIndex + imageWidth * 4);
      }
    } else if (frame.disposalMethod === 3) {
      // 将图片还原成上一帧的图片
      const prevFramePixelData =
        frames[frames.length - 1]?.pixelData ?? new Uint8Array(width * height * 4);
      pixelData.set(prevFramePixelData);
    }

    frames.push(frame);
  };

  /**
   * 解析扩展数据
   */
  const parseExtension = () => {
    const extensionControlLabel = stream.readByte();

    switch (extensionControlLabel) {
      case 0xf9: {
        // Graphic Control Extension

        const blockSize = stream.readByte();

        const gcePacketField = stream.readByte();
        /**
         * 保留字段
         */
        const reserved = (gcePacketField >>> 5) & 7;
        /**
         * 绘制当前帧之后的处理方式
         * 0 未定义，解码器可以不做操作
         * 1 不处理，下一帧的图片直接盖在本帧上面
         * 2 还原为背景色
         * 3 还原为当前帧渲染之前的图片
         * 4-7 未定义
         */
        const disposalMethod = (gcePacketField >>> 2) & 7;
        /**
         * 是否需要用户输入之后再播放下一帧
         * 1: 需要
         * 0: 不需要
         */
        const userInputFlag = (gcePacketField >>> 1) & 1;
        /**
         * 是否存在透明索引
         * 1: 存在
         * 0: 不存在
         */
        const transparentColorFlag = globalColorTableFlag & 1;
        /**
         * 帧延迟
         */
        const delay = stream.readUnsigned();
        /**
         * 透明索引值，当且仅当 Transparency Flag 设置为 1 的时候才存在
         */
        const transparencyIndex = stream.readByte();

        const blockTerminator = stream.readByte();

        // @ts-ignore
        frame = {
          reserved,
          disposalMethod,
          userInputFlag,
          delay,
          transparencyIndex: transparentColorFlag === 1 ? transparencyIndex : undefined,
        };
        break;
      }
      case 0xfe: {
        // Comment Extension
        /**
         * comment 信息
         */
        const commentData = parseDataSubBlocks();
        break;
      }
      case 0x01: {
        // Plain Text Extension

        const blockSize = stream.readByte();
        /**
         * 文本框左边缘到逻辑屏幕的左边缘的距离
         */
        const textGridLeftPosition = stream.readUnsigned();
        /**
         * 文本框上边缘到逻辑屏幕的上边缘的距离
         */
        const textGridTopPosition = stream.readUnsigned();
        /**
         * 文本框的宽度
         */
        const textGridWidth = stream.readUnsigned();
        /**
         * 文本框的高度
         */
        const textGridHeight = stream.readUnsigned();
        /**
         * 文本框中字符的宽度
         */
        const characterCellWidth = stream.readByte();
        /**
         * 文本框中字符的高度
         */
        const characterCellHeight = stream.readByte();
        /**
         * Global Color Table 的颜色索引，用来渲染文本的前景
         */
        const textForegroundColorIndex = stream.readByte();
        /**
         * Global Color Table 的颜色索引，用来渲染文本的背景
         */
        const textBackgroundColorIndex = stream.readByte();
        /**
         * 文本数据
         */
        const plainTextData = parseDataSubBlocks();
        break;
      }
      case 0xff: {
        // Application Extension

        const blockSize = stream.readByte();
        /**
         * 用于识别拥有应用扩展的应用程序
         */
        const applicationIdentifier = stream.readBytes(8);
        /**
         * 用于验证应用标识符
         */
        const applicationAuthenticationCode = stream.readBytes(3);
        /**
         * 应用数据
         */
        const applicationData = parseDataSubBlocks();
        break;
      }
      default: {
        // 未知扩展
        const data = parseDataSubBlocks();
      }
    }
  };

  const parseBlock = () => {
    const blockType = stream.readByte();

    switch (blockType) {
      case 0x21: {
        // 扩展
        parseExtension();
        break;
      }
      case 0x2c: {
        // 图像数据
        parseFrameImage();
        break;
      }
      case 0x3b: {
        // Gif 终止符号
        break;
      }
      default: {
        throw new Error(`unknown block type ${blockType}`);
      }
    }

    if (blockType !== 0x3b) {
      parseBlock();
    }
  };

  let frame: Frame;
  const frames: Frame[] = [];

  // 开始解析数据块
  parseBlock();

  return {
    version,
    width,
    height,
    frames,
  };
}

export default GifParser;
