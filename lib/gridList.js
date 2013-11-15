var GridList = function(items, options) {
  /**
   * A GridList manages a sorted list of rectangular items with variable width
   * and height.
   *
   * The GridList has two functions:
   *
   *  - Generate the 2d position based on the sorting index
   *  - TODO: Generate the sorting index based on the 2d position
   *
   * The 2d position is generated under the constraints of N rows and M columns
   * per Group (see below). The virtual grid space will expand horizontally to
   * any size required to fit all the items provided.
   *
   * A Group is a positional subset of the Grid, of variable columns. These are
   * the specs of the positioning algorithm:
   *
   *  - Groups are displayed one after another, from left to right.
   *  - Items withing a group are displayed left-to-right, top-to-bottom
   *  - If an item doesn't fit to the right of the previous item within the
   *    current Group, it will go under it
   *  - If an item doesn't fit under the previous item within the current
   *    Group, it will start a new Group, where it will be placed top-left
   *
   *  _G1____   _G2____
   * |_1_|_2_| |_5_|_6_|
   * |_3_|_4_| |_7_|
   *
   * The width and height of an item is expressed using the number of cols and
   * rows it takes un within the grid.
   *
   * Each item has a numerical sorting "index" and a 2d "position" within the
   * grid. At least one of them is required. One can be calculated from the
   * other.
   *
   * An item is an object of structure:
   * {
   *   cols: 3,
   *   rows: 1,
   *   index: 3,
   *   position: [0, 2]
   * }
   */
  this.options = _.extend({}, this.defaults, options || {});
  this.items = items;
};

GridList.prototype.defaults = {
  rows: 5,
  colsPerGroup: 5
};

GridList.prototype.generatePositionsFromIndex = function() {
  this.groups = [];
  this._startNewGroup();
  for (var i = 0; i < this.items.length; i++) {
    this._generateItemPositionFromIndex(this.items[i]);
  }
  return this.items;
};

GridList.prototype.generateIndexesFromPosition = function(item) {
  this._sortItemsByPosition();
  if (typeof(this.options.sortItemsByPosition) == 'function') {
    this.options.sortItemsByPosition.call(this, this.items);
  }
  return this.items;
};

GridList.prototype._sortItemsByPosition = function() {
  var _this = this;
  this.items.sort(function(item1, item2) {
    var groupItem1 = Math.floor(item1.position.col / _this.options.colsPerGroup);
    var groupItem2 = Math.floor(item2.position.col / _this.options.colsPerGroup);
    // It's simple for items in different groups, the smaller the group number,
    // the smaller the sorting index
    if (groupItem1 != groupItem2) {
      return groupItem1 - groupItem2;
    }
    // Rows preced cols when it comes to sorting, so if an item is from a
    // smaller row, its sorting index will be smaller
    if (item1.position.row != item2.position.row) {
      return item1.position.row - item2.position.row;
    }
    // An earlier column means a smaller index
    if (item1.position.col != item2.position.col) {
      return item1.position.col - item2.position.col;
    }
    return 0;
  });
};

GridList.prototype._generateItemPositionFromIndex = function(item) {
  var currentGroup = this._getCurrentGroup();
  var itemPosition = currentGroup.findPositionForItem(item);
  // Warning: Any item must fit in a new blank group, otherwise this will go
  // into an infinite recursion loop
  if (itemPosition) {
    item.position = itemPosition;
    currentGroup.markItemCells(item);
    // Apply offset of cols based on the number of Groups before the current
    // one, to make the item position relative to the entire grid
    item.position.col += this.groups.indexOf(currentGroup) *
                         this.options.colsPerGroup;
  } else {
    this._startNewGroup();
    this._generateItemPositionFromIndex(item);
  }
};

GridList.prototype._startNewGroup = function() {
  this.groups.push(new GridGroup(this.options.colsPerGroup, this.options.rows));
};

GridList.prototype._getCurrentGroup = function() {
  return this.groups[this.groups.length - 1];
};

GridList.prototype._getIndexOfItem = function(item) {
  return this.items.indexOf(item);
};


var GridGroup = function(cols, rows) {
  this.colsPerRow = cols;
  // Create empty rows
  for (var i = 0; i < rows; i++) {
    this.push(new GridRow(cols));
  }
};

// Extend the Array prototype
GridGroup.prototype = [];

GridGroup.prototype.findPositionForItem = function(item) {
  var x, y, row, position;
  for (y = 0; y < this.length; y++) {
    row = this[y];
    for (x = 0; x < row.length; x++) {
      position = {
        col: x,
        row: y
      };
      if (this.itemFitsAtPosition(item, position)) {
        return position;
      }
    }
  }
  // There isn't available space for item in this Group
  return null;
};

GridGroup.prototype.itemFitsAtPosition = function(item, position) {
  /**
   * Check that an item wouldn't overlap with another one if placed at a
   * certain position within the grid
   */
  var x, y, row;
  // Make sure the item doesn't go outside of the grid bounds
  if ((position.col + item.cols > this.colsPerRow) ||
      (position.row + item.rows > this.length)) {
    return false;
  }
  // Make sure the item doesn't overlap with an already positioned item, or
  // isn't placed before a previous item
  for (y = position.row; y < this.length; y++) {
    row = this[y];
    for (x = position.col; x < row.length; x++) {
      if (row[x]) {
        return false;
      }
    }
  }
  return true;
};

GridGroup.prototype.markItemCells = function(item) {
  /**
   * Mark the grid cells that are occupied by an item. This prevents items
   * from overlapping in the grid
   */
  var x, y, row;
  for (y = item.position.row; y < item.position.row + item.rows; y++) {
    row = this[y];
    for (x = item.position.col; x < item.position.col + item.cols; x++) {
      row[x] = item;
    }
  }
};


var GridRow = function(cols) {
  for (var i = 0; i < cols; i++) {
    this.push(null);
  }
};

// Extend the Array prototype
GridRow.prototype = [];