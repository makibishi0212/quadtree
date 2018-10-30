import paper from 'paper';
import isEqual from 'fast-deep-equal';

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

    this.update = () => {

    };

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

  get color() {
    return this.origin.fillColor;
  }

  set color(color) {
    this.origin.fillColor = color;
  }

  setSpeed(vX, vY) {
    this.vx = vX;
    this.vy = vY;
  }

  onupdate() {
    // このメソッドを親から毎フレーム実行するようにする
    this.update();

    this.isMove = false;

    this.x += (this.vx / 30);
    this.y += (this.vy / 30);

    this.prevAddress = this.address;
    this.computeMortonOrder();
    if (!isEqual(this.prevAddress, this.address)) this.isMove = true;
    if (!this.address) {
      if (this.vx && this.x > 700) this.x = -60;
      if (this.vy && this.y > 700) this.y = -60;
    }
  }

  intersects(hyperRect) {
    // 衝突を判定する関数
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
      return;
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

  move(prevAddress, address, obj) {
    // オブジェクトのアドレスを移動
    this.delete(prevAddress, obj);
    this.add(address, obj);
  }

  computeObjCollide(obj, collideDetectFunc) {
    // そのオブジェクトが他オブジェクトと衝突しているかどうか判定する
    // この実装では他の任意のオブジェクトと衝突しているかどうかのみ計算する
    if (!obj.address) {
      return false;
    }

    // オーダーと深さからインデックスを計算する関数
    const calcIndex = (order, depth) => (((4 ** depth) - 1) / 3) + order;

    let isCollide = false;

    // 自身よりも上位の空間と自身の空間に対する検索
    for (let depth = 0; depth <= obj.address.depth; depth += 1) {
      const spaceOrder = obj.address.order >> ((obj.address.depth - depth) * 2);
      const spaceIndex = calcIndex(spaceOrder, depth);

      // console.log(obj.address.depth + ':' + obj.address.order, spaceOrder);

      let compareCell = this.treeArray[spaceIndex] ? this.treeArray[spaceIndex].start : null;

      // 対象空間のオブジェクトとの衝突判定
      while (compareCell) {
        if (obj !== compareCell.obj && collideDetectFunc(obj, compareCell.obj)) {
          isCollide = true;
          compareCell = null;
        } else {
          compareCell = compareCell.next;
        }
      }

      if (isCollide) break;
    }

    // 自身よりも下位の空間に対する検索
    // (0011 で 001100 001101 001110 001111 00110000)
    const spaceOrder = obj.address.order;
    const spaceDepth = obj.address.depth;

    // 自身の空間からさらにもぐる深さ
    let subDepth = 1;

    let tmpOrder = spaceOrder;

    while (spaceDepth + subDepth <= this.maxDepth) {
      // その深さでの空間数
      const spaceNum = 4 ** subDepth;

      for (let i = 0; i < spaceNum; i += 1) {
        tmpOrder = (spaceOrder << (subDepth * 2)) + i;
        // console.log(spaceDepth + ':' + spaceOrder, tmpOrder);

        const tmpIndex = calcIndex(tmpOrder, spaceDepth + subDepth);

        let compareCell = this.treeArray[tmpIndex] ? this.treeArray[tmpIndex].start : null;

        // 対象空間のオブジェクトとの衝突判定
        while (compareCell) {
          if (obj !== compareCell.obj && collideDetectFunc(obj, compareCell.obj)) {
            isCollide = true;
            compareCell = null;
          } else {
            compareCell = compareCell.next;
          }
        }

        if (isCollide) break;
      }

      if (isCollide) break;

      subDepth += 1;
    }

    return isCollide;
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

    // オブジェクトが他のオブジェクトと衝突しているかの判定結果を格納する
    this.collideArray = [];

    this.onupdate = () => {

    };

    paper.view.onFrame = () => {
      this.onupdate();

      const objLength = this.objects.length;
      for (let i = 0; i < objLength; i += 1) {
        this.objects[i].onupdate();
        if (this.objects[i].isMove) {
          this.objTree.move(this.objects[i].prevAddress, this.objects[i].address, this.objects[i]);
        }
      }
      for (let i = 0; i < objLength; i += 1) {
        this.computeObjCollide(i);
        if (this.collideArray[i]) {
          this.objects[i].color = '#f04283';
        } else {
          this.objects[i].color = '#42f083';
        }
      }

    };
  }

  add(obj) {
    this.objects.push(obj);
    this.collideArray.push(false);
    this.objTree.add(obj.address, obj);
  }

  computeObjCollide(objIndex) {
    this.collideArray[objIndex] = this.objTree.computeObjCollide(this.objects[objIndex], (obj1, obj2) => obj1.intersects(obj2));
  }
}

paper.install(window);

const maxDepth = 3;

const world = new World(document.getElementById('myCanvas'), maxDepth);

const verticalNum = 40;
const verticalRects = new Array(verticalNum);
for (let i = 0; i < verticalNum; i += 1) {
  const initX = Math.round((world.width - 40) * Math.random()) + 20;
  const vY = Math.round(75 * Math.random()) + 25;
  const size = Math.round(30 * Math.random()) + 5;
  verticalRects[i] = new HyperRect(new paper.Point(initX, -50), new paper.Size(size, size), world.width, maxDepth, '#42f083');
  verticalRects[i].setSpeed(0, vY);

  world.add(verticalRects[i]);
}

const horizontalNum = 40;
const horizontalRects = new Array(horizontalNum);
for (let i = 0; i < horizontalNum; i += 1) {
  const initY = Math.round((world.width - 40) * Math.random()) + 20;
  const vX = Math.round(75 * Math.random()) + 25;
  const size = Math.round(30 * Math.random()) + 5;
  horizontalRects[i] = new HyperRect(new paper.Point(-50, initY), new paper.Size(size, size), world.width, maxDepth, '#42f083');
  horizontalRects[i].setSpeed(vX, 0);

  world.add(horizontalRects[i]);
}

world.onupdate = () => {
  /*
  if (rect.intersects(rect2)) {
    console.log('oh hit');
  }
  */
};
