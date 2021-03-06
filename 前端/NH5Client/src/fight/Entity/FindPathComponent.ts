//寻路组件
class FindPathComponent extends ComponentBase
{
	//寻路路径
	protected findQueue:Queue<MapModule.MapCell>;

	//目标位置
	protected ptTarget:egret.Point;

	//组件类型
	public get type():ComponentType { return ComponentType.FindPath; }

	//初始化组件
	public init():void
	{
		this.findQueue = new Queue<MapModule.MapCell>();
	}

	//释放组件
	public release():void
	{
		this.findQueue.clear();
		this.findQueue = null;
	}

	//获取向目标移动的下一个格子
	public getNextMoveCell(toPoint:egret.Point, selfPos:egret.Point, distance:number):egret.Point
	{
		//如果目标位置没有发生改变，而且行进路径的下个点没有人占据，将直接返回路径的下一个点
		if (this.findQueue.count > 0 && (!!this.ptTarget && this.ptTarget.x == toPoint.x && this.ptTarget.y == toPoint.y) && this.findQueue.getPeek().isOpen)
			return this.findQueue.deQueue().toPoint();

		this.findQueue.clear();
		this.findQueue = MapModule.findPath(selfPos.x, selfPos.y, toPoint.x, toPoint.y, distance);

		return this.findQueue.deQueue().toPoint();
	}
}