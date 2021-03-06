module MapModule
{
	 //地图ID对应地图信息
	 var mapInfoDic: Dictionary<number, MapInfo> = new Dictionary<number, MapInfo>();

	 //地图ID对应所有地图格子
	 var mapCellDic: Dictionary<number, Dictionary<number, MapCell>> = new Dictionary<number, Dictionary<number, MapCell>>();

	 //获取地图
	 export function getMapInfo(mapId:number):MapInfo
	 {
		 return mapInfoDic.getValue(mapId);
	 }

	 //创建地图信息
	 export function createMapInfo(callback?:()=>void, thisArg?:any):void
	 {
		 var templeArr:Array<data.MapTemple> = TempleMgr.selectAll<data.MapTemple>("MapTemple");
		 if (!!templeArr && templeArr.length > 0)
		 {
			 var mapPathList = new List<string>();
			 templeArr.forEach(mapTp => { mapPathList.add("resource/config/map/" + mapTp.mapRes + ".mpt"); });
			 AssetsMgr.instance.loadTextGroup(mapPathList.toArray(), (dic) =>
			 {
				 dic.foreach((value, key) => { createMapCell(value as MapInfo, parseInt(key)); });

				 if (!!callback)
				 	callback.call(thisArg);
			 });
		 } 
	 }

	 //创建地图格子
	 function createMapCell(mapInfo:MapInfo, mapId:number):void
	 {
		 if (!mapInfo) return;
		 mapInfoDic.add(mapId,mapInfo);
		 var cellDic:Dictionary<number, MapCell> = new Dictionary<number, MapCell>();

		 for(var y:number = 0; y < mapInfo.rowCount; y++)
		 {
			 for(var x:number = 0; x < mapInfo.colCount; x++)
			 {
			 	if (mapInfo.blocks[y][x] == 1)
			 		continue;

				 var mapCell = new MapCell(x, y, x * mapInfo.rowCount + y);
				 cellDic.add(mapCell.Index, mapCell);
			 }
		 }

		 cellDic.foreach((mapCell:MapCell) =>
		 {
		 	mapCell.updateAroundCell(cellDic, mapInfo);
		 });

		 mapCellDic.add(mapId, cellDic);
	 }

	 //获取指定地图格子信息
	 export function getMapCell(x:number, y:number, mapId?:number):MapCell
	 {
		 mapId = mapId || SceneModule.BattleScene.currMapId;
		 var mapInfo:MapInfo = mapInfoDic.getValue(mapId);
		 var cellDic:Dictionary<number, MapCell> = mapCellDic.getValue(mapId);

		 if (!!MapInfo && !!cellDic)
			 return cellDic.getValue(x * mapInfo.rowCount + y);

		 return null;
	 }

	 //通过点坐标 获取指定格子信息
	 export function getMapCellByPoint(point:egret.Point, mapId?:number):MapCell
	 {
		 if (!!point)
		 	return getMapCell(point.x, point.y, mapId);

		 return null;
	 }

	 //获取指定数量的随机格子
	 export function getRandomCellByPoint(pt:egret.Point, count:number, mapId?:number):List<MapCell>
	 {
		 return getRandomCell(pt.x, pt.y, count, mapId);
	 }

	 //获取指定数量的随机格子
	 export function getRandomCell(x:number, y:number, count:number, mapId?:number):List<MapCell>
	 {
		 var currCell = getMapCell(x, y, mapId);
		 if (!currCell)
		 	return null;

		 var cellList = new List<MapCell>();
		 currCell.getRandomCell(cellList, count);

		 if (cellList.count < count)
		 	addRandomOpenCell(cellList, 0, count);

		 return cellList;
	 }

	 //添加随机开放格子
	 function addRandomOpenCell(cellList:List<MapCell>, index:number, count:number):void
	 {
		 if (cellList.count >= count)
		 	return;
		
		console.error("currCount: " + cellList.count + " needCount: " + count);
		 var addList = cellList.getRange(index);
		 addList.forEach(cell => { cell.getRandomCell(cellList, count); });

		 addRandomOpenCell(cellList, cellList.count, count);
	 }

	 //以目标为中心在屏幕边界范围中随机取一个点
	 export function randomBorder(ptFrom:egret.Point, rangeX:number, rangeY:number, mapId?:number):egret.Point
	 {
		 mapId = mapId || SceneModule.BattleScene.currMapId;

		 var borderList = new List<egret.Point>();

		 //上下边
		 var upY = ptFrom.y - rangeY;
		 var downY = ptFrom.y + rangeY;

		 for(let ix = ptFrom.x - rangeX; ix < (ptFrom.x + rangeX); ix++)
		 {
			 if (!isBlock(ix, upY, mapId)) borderList.add(new egret.Point(ix, upY));
			 if (!isBlock(ix, downY, mapId)) borderList.add(new egret.Point(ix, downY));
		 }

		 var leftX = ptFrom.x - rangeX;
		 var rightX = ptFrom.x + rangeY;

		 for(let iy = ptFrom.y - rangeY; iy < (ptFrom.y + rangeY); iy++)
		 {
			 if (!isBlock(leftX, iy, mapId)) borderList.add(new egret.Point(leftX, iy));
			 if (!isBlock(rightX, iy, mapId)) borderList.add(new egret.Point(rightX, iy));
		 }

		 return borderList.getItem(Utility.random(0, borderList.count - 1));
	 }

	 //寻路 sx,sy:起点 tx,ty:终点 distance:距离终点多长停止
	 export function findPath(sx:number, sy:number, tx:number, ty:number, distance:number):Queue<MapCell>
	 {
		 var cellQueue:Queue<MapCell> = new Queue<MapCell>();

		 var start:MapCell = getMapCell(sx, sy);
		 var target:MapCell = getMapCell(tx, ty);

		 if (!start || !target) return cellQueue;

		 if (start.Index == target.Index || Utility.distance(sx, sy, tx, ty) <= distance)
		 	return cellQueue;

		 var openList:Array<MapCell> = new Array<MapCell>();
		 var closeList:Array<MapCell> = new Array<MapCell>();

		 var isFindTarget:boolean = false;
		 var currMapCell:MapCell = null;

		 start.parent = null;
		 start.H = 0;
		 start.isOpen = false;

		 openList.push(start);

		 while(openList.length > 0 && !isFindTarget)
		 {
			 if (openList.length > 1)
			 	openList.sort((lh, rh) => { return Utility.compareNumber(lh.F, rh.F); });

			 currMapCell = openList[0];
			 openList.splice(0, 1);
			 closeList.push(currMapCell);

			 currMapCell.aroundCellList.forEach((mapCell) =>
			 {
				 if (!mapCell.isOpen && mapCell.Index != target.Index)
				 	return;

				 if (mapCell.Index == target.Index)
				 {
					 isFindTarget = true;
					 mapCell.parent = currMapCell;
					 return;
				 }

				 mapCell.H = currMapCell.H + Utility.distance(currMapCell.X, currMapCell.Y, mapCell.X, mapCell.Y);
				 mapCell.G = Utility.distance(mapCell.X, mapCell.Y, target.X, target.Y);
				 mapCell.F = mapCell.G + mapCell.H;

				 mapCell.parent = currMapCell;

				 openList.push(mapCell);
				 mapCell.isOpen = false;
			 });
		 }

		 openList.forEach((cell) => { cell.isOpen = true; });
		 closeList.forEach((cell) => { cell.isOpen = true; })

		 if (isFindTarget)
		  {
			 currMapCell = target;
			 while(!!currMapCell.parent)
			 {
				cellQueue.enQueue(currMapCell);
				currMapCell = currMapCell.parent;	 
			 }

			 if (distance > 0)
			 	cellQueue.removeRange(0, distance);

			 cellQueue.queueReverse();
		 }

		 return cellQueue;
	 }

	 //是否是障碍
	 export function isBlock(x:number, y:number, mapId?:number):boolean
	 {
	 	 var mapCell = getMapCell(x, y, mapId);
		 if (!mapCell || !mapCell.isOpen)
		 	return true;

		 return false;
	 }

	 //周围朝向
	 export enum Around
	 {
		MIDDLE, 	//中间 主要用作当前朝向
        UP,     	//上
        RIGHTUP,   	//右上
        RIGHT,     	//右
        RIGHTDOWN, 	//右下
        DOWN,     	//下
        LEFTDOWN, 	//左下
        LEFT,     	//左
        LEFTUP, 	//左上
	 }

	 //单位信息类
     class UnitInfo
     {
        public y:number;
        public templeID:number;
        public i:number;
        public j:number;
        public x:number;
     }

     //装饰信息类
     class OrnaInfo
     {
        public y:number;
        public x:number;
        public url:string;
     }

     //区域信息类
     class AreaInfo
     {
        public name:string
        public x:number;
        public y:number;
        public w:number;
        public h:number;
     }

	 //地图数据信息
	 export class MapInfo
	 {
		 public blocks:number[][] ; //障碍信息
		 public mapWith:number;		//地图宽
		 public bg:string;			//地图名
		 public mapHeight:number;	//地图高
		 public units:UnitInfo;		//单位信息
		 public ornas:OrnaInfo;		//装饰信息
		 public areas:AreaInfo;		//区域信息
		 public width:number;		//宽
		 public height:number;		//高
		 public rowCount:number;	//行数
		 public colCount:number;	//列数
	 }

	 //地图格子
	 export class MapCell
	 {
		 //标注格子坐标
		 public X:number; //行
		 public Y:number; //列
		 public Index:number;//二维坐标转一维后的下标

		 //用于寻路 F=G+H
		 public G:number; //当前到终点
		 public H:number; //起点到当前
		 public F:number; //G+H

		 public isOpen:boolean; //是否开放当前格子
		 public parent:MapCell; //父节点

		 //当前格子周边可行走格子
		 public readonly aroundCellList:List<MapCell>;

		 //构造
		 public constructor(x:number, y:number, index:number)
		 {
			this.X = x;
			this.Y = y;
			this.Index = index;
			this.isOpen = true;

			this.aroundCellList = new List<MapCell>();
		 }

		 //更新周围格子
		 public updateAroundCell(mapCellDic:Dictionary<number, MapCell>, mapInfo:MapInfo)
		 {
			 this.AddAroundCell(mapCellDic, mapInfo, MapModule.Around.LEFT, this.X - 1, this.Y);
			 this.AddAroundCell(mapCellDic, mapInfo, MapModule.Around.RIGHT, this.X + 1, this.Y);
			 this.AddAroundCell(mapCellDic, mapInfo, MapModule.Around.DOWN, this.X, this.Y + 1);
			 this.AddAroundCell(mapCellDic, mapInfo, MapModule.Around.UP, this.X, this.Y - 1);

			 this.AddAroundCell(mapCellDic, mapInfo, MapModule.Around.LEFTDOWN, this.X - 1, this.Y + 1);
			 this.AddAroundCell(mapCellDic, mapInfo, MapModule.Around.RIGHTDOWN, this.X + 1, this.Y + 1);
			 this.AddAroundCell(mapCellDic, mapInfo, MapModule.Around.LEFTUP, this.X - 1, this.Y - 1);
			 this.AddAroundCell(mapCellDic, mapInfo, MapModule.Around.RIGHTUP, this.X + 1, this.Y - 1);
		 }

		 //添加地图格子
		 public AddAroundCell(mapCellDic:Dictionary<number, MapCell>, mapInfo:MapInfo, around:number, x:number, y:number) : void
		 {
			 if (x < 0 || x >= mapInfo.colCount || y < 0 || y >= mapInfo.rowCount)
			 	return;

			 if (mapInfo.blocks[y][x] == 1)
			 	return;

			 var mapCell: MapCell = mapCellDic.getValue(x * mapInfo.rowCount + y);
			 if (!!mapCell)
			 	this.aroundCellList.add(mapCell);
		 }

		 //从周边格子查找指定个数的开放格子，并返回添加个数
		 public getRandomCell(cellList:List<MapCell>, count:number):void
		 {
			 if (cellList.count >= count)
			 	return;

			 var newList = this.aroundCellList.toNewList();
			 while(cellList.count < count && newList.count > 0)
			 {
				 var index:number = 0
				 var item = newList.getItem(index);
				 if (item.isOpen && !cellList.contains(item))
				 	cellList.add(item);

				 newList.removeAt(index);
			 }
		 }

		 //转换成坐标
		 public toPoint():egret.Point
		 {
			 return new egret.Point(this.X, this.Y);
		 }
	 }
}