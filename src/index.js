import paper from 'paper';

const canvas = document.getElementById('myCanvas');

paper.install(window);
paper.setup(canvas);

class HyperRect {
  constructor(topLeft, size, worldLength, depth, color = 'red') {
    this.origin = new paper.Path.Rectangle(topLeft, size);
    this.origin.fillColor = color;
    this.worldLength = worldLength;
    this.depth = depth;
    this.depthDigit = (2 ** (depth - 1));
    this.unitLength = worldLength / this.depthDigit;
    this.mortonOrder = null;
  }

  get x() {
    return this.origin.position.x;
  }

  set x(x) {
    this.origin.position.x = x;
    this.computeRectMortonOrder();
  }

  get y() {
    return this.origin.position.y;
  }

  set y(y) {
    this.origin.position.y = y;
    this.computeRectMortonOrder();
  }

  intersects(hyperRect) {
    if (this.origin.bounds.intersects(hyperRect.origin.bounds)) {
      return true;
    }

    return false;
  }

  computeRectMortonOrder() {
    /*
    矩形のモートン順序は、左上および右下のポイントのモートン順序から計算する
    モートン順序はルート空間以降の全空間の座標を含むので、矩形の所属空間はXORをとったものを最上位桁から2ビットずつ見て、
    初めて0でなくなる空間に等しい
    */

    const { topLeft, bottomRight } = this.origin.bounds;
    this.mortonOrder = null;

    const topLeftOrder = this.computePointMortonOrder(topLeft);
    const bottomRightOrder = this.computePointMortonOrder(bottomRight);

    const pointXor = topLeftOrder ^ bottomRightOrder;

    let digit = (this.depth - 1);
    while (!((pointXor >> (digit * 2)) & 0b11) && digit) {
      digit -= 1;
    }
    const rectSpaceLevel = (this.depth - 1) - digit;
    const shiftNum = (this.depth - rectSpaceLevel) * 2;

    return topLeftOrder >> shiftNum;
  }

  computePointMortonOrder(point) {
    /*
    モートン順序をx,yから計算する

    x: 3,y: 6の場合

      3:  0 1 1
      6: 1 1 0
         101101 = 45
    */

    const x = Math.floor(point.x / this.unitLength);
    const y = Math.floor(point.y / this.unitLength);

    let tmpOrder = 0;
    for (let digit = (this.depth - 1); digit >= 0; digit -= 1) {
      tmpOrder += ((x >> digit) & 0b1) ? (0b1 << (digit * 2)) : 0;
      tmpOrder += ((y >> digit) & 0b1) ? (0b1 << ((digit * 2) + 1)) : 0;
    }

    return tmpOrder;
  }
}

const rect = new HyperRect(new paper.Point(10, 10), new paper.Size(20, 20), paper.view.size.width, 4, 'green');
const rect2 = new HyperRect(new paper.Point(100, 10), new paper.Size(150, 150), paper.view.size.width, 4, 'red');

paper.view.onFrame = () => {
  rect.x += 0.5;
  if (rect.intersects(rect2)) {
    console.log('oh hit');
  }
};
