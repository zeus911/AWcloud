insMonitorCtrl.$inject = ['$scope','$rootScope','$timeout','NgTableParams','$uibModal',"GLOBAL_CONFIG",'checkedSrv','tdsqlSrv']
function insMonitorCtrl($scope,$rootScope,$timeout,NgTableParams,$uibModal,GLOBAL_CONFIG,checkedSrv,tdsqlSrv) {
    var self = $scope;
    self.monitorList=[{
    	"id":"1",
    	"name":"全局监控指标",
    	"child":[
    	   {
    	   	  "name":"CPU利用率",
    	   	  "value":"cpu",
    	   	  "parentId":"1",
    	   	  "active":"cpu",
    	   },
    	   {
    	   	  "name":"缓存命中率",
    	   	  "value":"cacheHitRate",
    	   	  "parentId":"1",
    	   	  "active":"cacheHitRate",
    	   },
    	   {
    	   	  "name":"可缓存空间",
    	   	  "value":"cacheSpace",
    	   	  "parentId":"1",
    	   	  "active":"cacheSpace",
    	   }
    	]
    },{
    	"id":"2",
    	"name":"关键性能指标",
    	"child":[
    	   {
    	   	  "name":"SQL总数",
    	   	  "value":"sqlTotal",
    	   	  "parentId":"2",
    	   	  "active":"sqlTotal",
    	   },
    	   {
    	   	  "name":"SQL错误数",
    	   	  "value":"sqlErrorNum",
    	   	  "parentId":"2",
    	   	  "active":"sqlErrorNum",
    	   },
    	   {
    	   	  "name":"SQL成功数",
    	   	  "value":"sqlSuccessNum",
    	   	  "parentId":"2",
    	   	  "active":"sqlSuccessNum",
    	   }
    	]
    }];
    self.selectMonitorType=function(monitor){
        if(monitor.open){
           monitor.open=false;
        }else{
           self.monitorList.forEach(function(item){
               if(item.id!=monitor.id){
                  item.open=false;
               }else{
               	  item.open=true;
               }
           });
        }
    };
}
export{insMonitorCtrl}
