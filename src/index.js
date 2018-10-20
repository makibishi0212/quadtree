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
    this.unitLength = worldLength / (2 ** (depth - 1));
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
    const { topLeft, bottomRight } = this.origin.bounds;
    this.mortonOrder = null;
  }

  computePointMortonOrder(point) {
    const horizontal = Math.floor(point.x / this.unitLength);
    const vertical = Math.floor(point.y / this.unitLength);
    
    const posToOrder = (vertical, horizontal) => {
      let tmpOrder = 0;
      for (let digit = this.depth; digit >= 0; digit -= 1) {

      }
    }
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
