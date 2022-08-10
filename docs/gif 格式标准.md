# Gif 格式标准

Gif 格式标准主要有 87a 和 89a 两个版本。

Gif 数据可以分成两个部分，第一部包含 Header、Logical Screen Descriptor 和 Global Color Table（可选）；第二部分包括图像数据和各种扩展块。

## 1.Header
Header 标识着 Gif 数据流的开始，其中包含的数据如下
1. Signature
   > 大小为 3 Bytes，内容为 "GIF" 三个字母
2. Version
   > 大小为 3 Bytes，表明 GIF 的版本，87a 或者 89a

## 2.Logical Screen Descriptor
Logical Screen Descriptor 包含了描述在设备上呈现图像区域所需的参数，包括图片的宽高、色彩深度等
1. Logical Screen Width
   > 大小为 2 Bytes，图像宽度
2. Logical Screen Height
   > 大小为 2 Bytes，图像宽度
3. Packed Fields
   > 大小为 1 Byte，表示色彩表的信息，包含 4 部分信息
   > 1. Global Color Table Flag，大小为 1 bit，表示是否有全局色彩表，1 表示有；0表 示无
   > 2. Color Resolution，大小为 3 bits，值 +1 后表示图像原色的位数。例如：0b111 时 +1 为 8，即颜色用 8 bits 表示，就是熟悉的 RGB
   > 3. Sort Flag，大小为 1 bit，表示是否对色彩表里的颜色进行优先度排序，1 表示排序了，重要的颜色优先；0 表示没有排序
   > 4. Global Color Table Size，大小为 3 bits，值 +1 后作为 2 的幂表示色彩表的长度。例如：0b111 时 +1 为 8，2^8 为 256，表示 GIF 最多支持 256 种颜色
4. Background Color Index
   > 大小为 1 Byte，表示 GIF 透明区域背景色在色彩表里的索引
5. Pixel Aspect Ratio
   > 大小为 1 Byte，定义像素的宽高比，一般为 0

## 3.Global Color Table
Global Color Table 表示全局色彩表，仅当 Global Color Table Flag 为 1 时才存在，大小为 3 * 2^(Global Color Table Size + 1)。

GIF 数据在存储时，会将图像用到的颜色提取出来，形成一个色彩表，在储存图像像素色彩时，不存储色彩信息，而是存储颜色在色彩表中的索引。

除了全局色彩表，图像数据还可以拥有局部色彩表，优先使用局部色彩表。

## 4.图像数据
Gif 数据流中的每个图像数据都包含了一个 Image Descriptor、一个可选的 Local Color Table 和图像像素数据。

### 4.1 Image Descriptor
Image Descriptor 包含处理基于表格的图像所需的参数
1. Image Separator
   > 大小为 1 Byte，标识一个图像的开始，值为 0x2C
2. Image Left Position
   > 大小为 2 Bytes，列数量，单位为像素，距离图像左边缘的列数
3. Image Top Position
   > 大小为 2 Bytes，行数量，单位为像素，距离顶部的列数
4. Image Width
   > 大小为 2 Bytes，图像宽度像素数
5. Image Height
   > 大小为 2 Bytes，图像高度像素数
6. Packed Fields
   > 大小为 1 Byte
   > 1. Local Color Table Flag，大小为 1 bit，作用与 Global Color Table Flag 相似，表示是否存在 Local Color Table
   > 2. Interlace Flag，大小为 1 bit，标识图片是否为隔行扫描，1 表示隔行扫描，0 表示否
   > 3. Sort Flag，大小为 1 bit，表示 Local Color Table 是否被排序，1 表示有，0 表示无
   > 4. Bits Reversed，大小为 2 bits，保留字段
   > 5. Local Color Table Size，大小为 3 bits，与 Global Color Table Size 计算方式类似，计算结果代表 Local Color Table 的长度

### 4.2 Local Color Table
Local Color Table 表示局部色彩表，类似于全局色彩表。大小为 3 * 2^(Local Color Table Size + 1)

### 4.3 Table Based Image Data
基于表格的图像像素数据
1. LZW Minimum Code Size
   > 大小为 1 Byte，决定了图像数据中 LZW 码的初始字节数
2. Image Data
   > 包括一系列通用的数据子块 Data Sub-blocks

**Data Sub-blocks**
> 数据子块是包含数据的单元。
> 数据子块的第一个 Byte 标识接下来数据块的大小 n，接下来 n Byte 的数据都是子块的具体数据。一个数据子块能够包含 0 到 255 Bytes 的数据
> Block Terminator，这个数据子块用来标识数据子块的终结，只包含 1 Byte 为 0x00 的数据，后面不包含数据

## 5.扩展数据
扩展主要在 89a 版本中引入

### 5.1 Graphic Control Extension
图形控制扩展，包含在处理图像渲染块时候用到的参数。

这个扩展的作用范围是跟随的第一张图像数据，这个块是可选的，一个图像数据渲染块之前最多有一个 Graphic Control Extension。

1. Extension Introducer
   > 大小为 1 Byte，扩展标识，值为 0x21
2. Graphic Control Label
   > 大小为 1 Byte，当前拓展标识，值为 0xF9
3. Block Size 
   > 大小为 1 Byte，表示当前拓展后面的数据大小（单位 Byte），不包括 Block Terminator，在当前拓展里值为 4
4. Packet Field，大小为 1 Byte
   > 1. Reserved，大小为 3 bits，保留字段
   > 2. Disposal Method，大小为 3 bits，表示绘制当前帧之后，如何处理
     >> - 0 未定义，解码器可以不做操作
     >> - 1 不处理，下一帧的图片直接盖在本帧上面
     >> - 2 还原为背景色
     >> - 3 还原为当前帧渲染之前的图片
     >> - 4-7 未定义
   > 3. User Input Flag，大小为 1 bit，表示是否需要用户输入后再播放下一帧。0 不需要；1 需要
   > 4. Transparent Color Flag，大小为 1 bit，标识是否在 Transparent Index 字段给出一个透明度索引。0 不给；1 给
5. Delay Time
   > 大小为 2 Bytes，帧延迟
6. Transparency Index
   > 大小为 1 Byte
7. Block Terminator，大小为 1 Byte，标识当前扩展的结束，值为 0x00

### 5.2 Comment Extension
注释扩展，一般用来储存图片作者的签名信息。这个扩展一般出现在数据流的最前或者最后

1. Extension Introducer
   > 大小为 1 Byte，扩展标识，值为 0x21
2. Comment Control Label
   > 大小为 1 Byte，当前拓展标识，值为 0xFE
3. Comment Data
   > 一系列的数据子块
4. Block Terminator
   > 大小为 1 Byte，标识当前扩展的结束，值为 0x00

### 5.3 Plain Text Extension
文本控制扩展，允许将图片的文字信息存储到这里，依赖解析器渲染。一般很少用

1. Extension Introducer
   > 大小为 1 Byte，扩展标识，值为 0x21
2. Plain Text Label
   > 大小为 1 Byte，当前扩展标识，值为 0x01
3. Block Size，大小为 1 Byte
   > 从 Block Size 后开始到 Data 部分的数据大小（单位：Byte）。在这里值为 12
4. Text Grid Left Position
   > 大小为 2 Bytes，文字左边缘距离屏幕左边缘的距离
5. Text Grid Top Position
   > 大小为 2 Bytes，文字上边缘距离屏幕上边缘的距离
6. Text Grid Width
   > 大小为 2 Bytes，文本框的宽度
7. Text Grid Height
   > 大小为 2 Bytes，文本框的高度
8. Character Cell Width
   > 大小为 1 Byte，文本框中字符的宽度
9. Character Cell Height
   > 大小为 1 Byte，文本框中字符的高度
10. Text Foreground Color Index 
   > 大小为 1 Byte，Global Color Table 的颜色索引，用来渲染文本的前景
11. Text Background Color Index
   > 大小为 1 Byte，Global Color Table 的颜色索引，用来渲染文本的背景
12. Plain Text Data
   > 一系列的数据子块
13. Block Terminator 
   > 大小为 1 Byte，标识当前扩展的结束，值为 0x00

### 5.4 Application Extension
程序扩展，主要包含了一些应用信息

1. Extension Introducer
   > 大小为 1 Byte，扩展标识，值为 0x21
2. Application Extension Label
   > 大小为 1 Byte，当前扩展标识，值为 0xFF
3. Block Size
   > 大小为 1 Byte，从 Block Size 后开始到 Data 部分的数据大小（单位：Byte）。在这里值为 11
4. Application Identifier
   > 大小为 8 Bytes，用于识别拥有应用扩展的应用程序
5. Application Authentication Code
   > 大小为 3 Bytes，用于验证应用标识符
6. Application Data
   > 一系列的数据子块
7. Block Terminator
   > 大小为 1 Byte，标识当前扩展的结束，值为 0x00

## 6.Gif 终止符号
值为 0x3b
