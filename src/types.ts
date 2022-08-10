export type Frame = {
  /**
   * 左偏移值
   */
  xOffset: number;
  /**
   * 右偏移值
   */
  yOffset: number;
  /**
   * 宽度
   */
  width: number;
  /**
   * 高度
   */
  height: number;
  /**
   * 帧的原始数据
   */
  data?: number[];
  /**
   * 像素值
   */
  pixelData: Uint8ClampedArray;
  /**
   * 帧延迟
   */
  delay: number;
  /**
   * 保留字段
   */
  reserved?: number;
  /**
   * 绘制当前帧之后，如何处理
   * 0 未定义，解码器可以不做操作
   * 1 不处理，下一帧的图片直接盖在本帧上面
   * 2 还原为背景色
   * 3 还原为当前帧渲染之前的图片
   * 4-7 未定义
   */
  disposalMethod: number;
  /**
   * 是否需要用户输入之后再播放下一帧
   * 1: 需要
   * 0: 不需要
   */
  userInputFlag?: number;
  /**
   * 透明索引值，当且仅当 Transparency Flag 设置为1的时候才存在
   */
  transparencyIndex?: number;
  /**
   * 图片是否是隔行扫描
   * 1: 是
   * 0: 否
   */
  interlaceFlag: number;
  /**
   * local color table 是否被排序
   * 1: 是
   * 0: 否
   */
  sortFlag: number;
  /**
   * 保留字段
   */
  bitsReversed?: number;
  /**
   * color table
   */
  colorTable: number[];
};

export type Gif = {
  version: string;
  width: number;
  height: number;
  frames: Frame[];
};
