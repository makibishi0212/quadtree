import paper from 'paper';
import isEqual from 'deep-equal';

class HyperRect {
  constructor(topLeft, size, worldLength, maxDepth, color = 'red') {
    this.origin = new paper.Path.Rectangle(topLeft, size);
    this.origin.fillColor = color;
    this.worldLength = worldLength;
    this.maxDepth = maxDepth;
    this.depthDigit = 2 ** this.maxDepth;
    this.unitLength = worldLength / this.depthDigit;
    this.prevAddress = null;
    this.address = null;
    this.vx = 0;
    this.vy = 0;
    this.computeMortonOrder();

    // このフレームでオブジェクトのorderが変化したかどうか
    this.isMove = false;
  }

  get x() {
    return this.origin.position.x;
  }

  set x(x) {
    this.origin.position.x = x;
  }

  get y() {
    return this.origin.position.y;
  }

  set y(y) {
    this.origin.position.y = y;
  }

  setSpeed(vX, vY) {
    this.vx = vX;
    this.vy = vY;
  }

  update() {
    // このメソッドを親から毎フレーム実行するようにする
    this.isMove = false;

    this.x += (this.vx / 30);
    this.y += (this.vy / 30);

    this.prevAddress = this.address;
    this.computeMortonOrder();
    if (!isEqual(this.prevAddress, this.address)) this.isMove = true;
  }

  intersects(hyperRect) {
    if (this.origin.bounds.intersects(hyperRect.origin.bounds)) {
      return true;
    }

    return false;
  }

  computeMortonOrder() {
    /*
    矩形のモートン順序は、左上および右下のポイントのモートン順序から計算する
    モートン順序はルート空間以降の全空間の座標を含むので、矩形の所属空間はXORをとったものを最上位桁から2ビットずつ見て、
    初めて0でなくなる空間に等しい
    */

    const { topLeft, bottomRight } = this.origin.bounds;
    this.mortonOrder = null;

    const topLeftOrder = this.computePointMortonOrder(topLeft);
    const bottomRightOrder = this.computePointMortonOrder(bottomRight);

    if (topLeftOrder === -1 || bottomRightOrder === -1) {
      this.address = null;
    }

    const pointXor = topLeftOrder ^ bottomRightOrder;

    let digit = (this.maxDepth - 1);
    while (!((pointXor >> (digit * 2)) & 0b11) && digit) {
      digit -= 1;
    }

    const rectSpaceLevel = (this.maxDepth) - digit;
    const shiftNum = digit * 2;

    this.address = {
      order: topLeftOrder >> shiftNum,
      depth: rectSpaceLevel,
    };
  }

  computePointMortonOrder(point) {
    /*
    モートン順序をx,yから計算する

    x: 3,y: 6の場合

      3:  0 1 1
      6: 1 1 0
         101101 = 45
    */

    if (point.x < 1 || point.x > this.worldLength || point.y < 1 || point.y > this.worldLength) {
      return -1;
    }

    const x = Math.floor(point.x / this.unitLength);
    const y = Math.floor(point.y / this.unitLength);

    let tmpOrder = 0;
    for (let digit = (this.maxDepth - 1); digit >= 0; digit -= 1) {
      tmpOrder += ((x >> digit) & 0b1) ? (0b1 << (digit * 2)) : 0;
      tmpOrder += ((y >> digit) & 0b1) ? (0b1 << ((digit * 2) + 1)) : 0;
    }

    // TODO: ビットをそろえる
    const max = (4 ** this.maxDepth) - 1;
    return (tmpOrder > max) ? max & tmpOrder : tmpOrder;
  }
}

class ObjCell {
  constructor(obj, prev) {
    this.obj = obj;
    this.prev = prev;
    this.next = null;
  }
}

class ObjList {
  constructor() {
    this.start = null;
    this.end = null;
    this.length = 0;
  }

  addObj(obj) {
    if (this.end) {
      const newCell = new ObjCell(obj, this.end);
      this.end.next = newCell;
      this.end = newCell;
    } else {
      this.start = new ObjCell(obj, null);
      this.end = this.start;
    }

    this.length += 1;
  }

  deleteObj(obj) {
    let targetCell = this.start;
    while (targetCell) {
      if (obj === targetCell.obj) {
        targetCell.prev = targetCell.next;
        targetCell = null;
        this.length -= 1;

        if (this.length === 0) {
          this.start = null;
          this.end = null;
        }
      } else {
        targetCell = targetCell.next;
      }
    }
  }
}

class ObjTree {
  constructor(maxDepth) {
    const geometricseries = ((4 ** (maxDepth + 1)) - 1) / 3;
    this.treeArray = new Array(geometricseries).fill(null);
    for (let i = 0; i < geometricseries; i += 1) this.treeArray[i] = new ObjList();
    this.maxDepth = maxDepth;
  }

  add(address, obj) {
    // オブジェクトをツリーに登録
    if (address) {
      const arrayIndex = (((4 ** address.depth) - 1) / 3) + address.order;
      this.treeArray[arrayIndex].addObj(obj);
    }
  }

  delete(address, obj) {
    // オブジェクトをツリーから削除
    if (address) {
      const arrayIndex = (((4 ** address.depth) - 1) / 3) + address.order;
      this.treeArray[arrayIndex].deleteObj(obj);
    }
  }

  move(obj) {
    // オブジェクトのアドレスを移動
    this.delete(obj.prevAddress, obj);
    this.add(obj.address, obj);
  }
}

class World {
  constructor(canvasElement, maxDepth) {
    const canvas = canvasElement;

    paper.setup(canvas);

    this.width = paper.view.size.width;
    this.height = paper.view.size.height;

    this.objTree = new ObjTree(maxDepth);
    this.objects = [];

    this.update = () => {

    };

    paper.view.onFrame = () => {
      this.update();

      this.objects.forEach((obj) => {
        obj.update();
        if (obj.isMove) {
          this.objTree.move(obj);
        }
      });
    };
  }

  add(obj) {
    this.objects.push(obj);
    this.objTree.add(obj.address, obj);
  }
}

paper.install(window);

const maxDepth = 3;

const world = new World(document.getElementById('myCanvas'), maxDepth);

const rect = new HyperRect(new paper.Point(10, 10), new paper.Size(20, 20), world.width, maxDepth, 'green');
const rect2 = new HyperRect(new paper.Point(200, 100), new paper.Size(120, 120), world.width, maxDepth, 'red');

rect.setSpeed(20, 32);
rect2.setSpeed(-20, 0);

world.add(rect);
world.add(rect2);

world.update = () => {
  if (rect.intersects(rect2)) {
    console.log('oh hit');
  }
};
