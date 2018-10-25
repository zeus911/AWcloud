import "./storageManagementSrv";
import {
    storageDiskCtrl as storageDiskCtrl
} from "./diskConfig";

var storageManagementModule = angular.module("storageManagementModule", ["storageManagementSrvModule"]);
storageManagementModule.controller("storageManagementCtrl", ["$scope", "$rootScope", "$location", "$routeParams",  "$filter", "$uibModal", "$translate", 
    "NgTableParams", "checkedSrv", "alertSrv", "storageManagementSrv", "GLOBAL_CONFIG", function ($scope, $rootScope, $location, $routeParams, $filter,
    $uibModal, $translate, NgTableParams, checkedSrv, alert, storageManagementSrv, GLOBAL_CONFIG) {
    var self = $scope;
    self.canCreate = false;
    self.canEdit = false;
    self.canDel = false;
    self.showLoading = false;
    self.storageNameList = [];
    self.backupCount = 0;
    self.openStorageModel = openStorageModel;
    self.deleteStorage = deleteStorage;
    self.refreshStorageTable = function() {
        self.globalSearchTerm = "";
        initTabData();
    }
    self.manuName = {
        ruijie: $translate.instant("aws.system.storagement.storageEnumeration.ruijie"),
        toyou: $translate.instant("aws.system.storagement.storageEnumeration.toyou"),
        nfs: $translate.instant("aws.system.storagement.storageEnumeration.nfs"),
        iscsi: $translate.instant("aws.system.storagement.storageEnumeration.iscsi"),
        fc: $translate.instant("aws.system.storagement.storageEnumeration.fc"),
        ceph: $translate.instant("aws.system.storagement.storageEnumeration.ceph"),
        out_ceph: $translate.instant("aws.system.storagement.storageEnumeration.out_ceph"),
        default: $translate.instant("aws.system.storagement.storageEnumeration.default")
    }

    //设置项的初始化
    self.titleName="system_storagement";
    if(sessionStorage["system_storagement"]){
       self.titleData = JSON.parse(sessionStorage["system_storagement"]);
    }else {
       self.titleData=[
          {name:'system.storagement.name',value:true,disable:true,search:"name"},
          {name:'system.storagement.use',value:true,disable:false,search:"use_ori"},
          {name:'system.storagement.deviceType',value:true,disable:false,search:"type"},
          {name:'system.storagement.allotCapacity',value:true,disable:false,search:"allocatedCapacity"},
          {name:'system.storagement.usedCapacity',value:true,disable:false,search:"usedCapacity"},
          {name:'system.storagement.totalCapacity',value:true,disable:false,search:"totalCapacity"},
          {name:'system.storagement.status',value:true,disable:false,search:"state_ori"},
          {name:'system.storagement.createTime',value:true,disable:false,search:"createTime"},
          {name:'system.storagement.description',value:true,disable:false,search:"description"}
       ];
    }
    self.storageSearchTerm = function(obj){
        var tableData = obj.tableData;
        var titleData = obj.titleData;
        tableData.map(function(item){
            item.searchTerm = "";
            titleData.forEach(function(showTitle){
                if(showTitle.value){
                    item.searchTerm += item[showTitle.search] + "\b";
                }
            });
        });
    };

    initTabData();

    // 初始化列表数据
    function initTabData() {
        self.canCreate = false;
        storageManagementSrv.getStorageTableData().then(function(result) {
            result.data?self.loadData = true:"";
            if(result && result.data) {
                self.backupCount = 0;
                self.storageNameList = [];
                self.storageCephCount = 0;
                self.storage_data = result.data;
                self.storage_data.map(item => {
                    if(item.use == "0" || item.use == "2") {
                        localStorage.cinderService = "cinder";
                        self.services.cinder = "cinder";
                        if(item.storageFirm == "ceph"){
                            localStorage.cephService = "ceph";
                            self.services.ceph = "ceph";
                        }
                        item.use_ori = $translate.instant("aws.system.storagement.storageTranslate.instancePool");
                        if(item.type) {
                            if(item.type == "UDS-Stor 3000G2-24R2") {
                                item.type = self.manuName["ruijie"] + "（" + item.type + "）";
                            }else {
                                item.type = self.manuName[item.storageFirm] + "（" + item.type + "）";
                            }
                        }else {
                            item.type = self.manuName[item.storageFirm];
                        }
                        if(item.state) {
                            item.state_ori = $translate.instant('aws.system.storagement.table.state.'+ item.state);
                        }
                        self.storageNameList.push(item.name);
                        if(item.storageFirm == "ceph" || item.storageFirm == "out_ceph") {
                            self.storageCephCount += 1;
                        }
                    }else if(item.use == "1") {
                        localStorage.backupsService = "backups";
                        self.services.backups = "backups";
                        item.use_ori = $translate.instant("aws.system.storagement.storageTranslate.instanceBackupsPool");
                        self.backupCount += 1;
                    }
                    if(item.allocatedCapacity != null && !isNaN(item.allocatedCapacity)) {
                        item.allocatedCapacity = item.allocatedCapacity.toFixed(2);
                    }
                    if(!isNaN(item.totalCapacity)) {
                        item.totalCapacity = item.totalCapacity.toFixed(2);
                        if(!isNaN(item.freeCapacity)) {
                            item.usedCapacity = (item.totalCapacity - item.freeCapacity).toFixed(2);
                        }
                    }
                    item.createTime = $filter("date")(item.createTime, "yyyy-MM-dd HH:mm:ss");
                    // item.searchTerm = [item.name, item.use, item.type, item.allocatedCapacity, item.totalCapacity, item.createTime, item.description].join("\b");
                });
                successFunc('tableParams');
            }           
        });
    }

    function successFunc(tableType) {
        self.canCreate = true;
        //根据session初始化searchterm
        self.storageSearchTerm({tableData: self.storage_data, titleData:self.titleData});
        self.tableParams = new NgTableParams({ count: GLOBAL_CONFIG.PAGESIZE }, { counts: [], dataset: self.storage_data });
        self.applyGlobalSearch = function() {
            var term = self.globalSearchTerm;
            self.tableParams.filter({ searchTerm: term });
        };
        var tableId = "id";
        checkedSrv.checkDo(self, self.storage_data, tableId, tableType);
    }

    function showLoading(tip, action) {
        self.showLoading = true;
        self.loadingMsg = tip;
        self.action = action;
    }

    function hideLoading() {
        self.showLoading = false;
    }

    self.$on("addStorageSuccess", function(e, data) {
        initTabData();
        hideLoading();
        if(self.action == "delete") {
            alert.set("", $translate.instant("aws.system.storagement.storageTranslate.deleteSuccess"), "success", 5000);
        }else {
            alert.set("", $translate.instant("aws.system.storagement.storageTranslate.addSuccess"), "success", 5000);
        }
        self.$apply();
    });

    self.$on("addStorageFailed", function(e, data) {
        hideLoading();
        if(self.action == "delete") {
            alert.set("", $translate.instant("aws.system.storagement.storageTranslate.deleteFail"), "error", 5000);
        }else {
            alert.set("", $translate.instant("aws.system.storagement.storageTranslate.addFail"), "error", 5000);
        }
        self.$apply();
    })

    self.$watch(function() {
        return self.checkedItems;
    }, function(values) {
        if(!values){return}
        self.edit_tip = "";
        self.del_tip = "";
        if(values.length == 1) {
            if(!values[0].status) { // status为true时, 表示正在使用中,不可编辑,不可删除
                self.canEdit = true;
                self.canDel = true;
            }else {
                self.canEdit = false;
                self.canDel = false;
                self.edit_tip =  $translate.instant("aws.system.storagement.storageTranslate.usingLimitEdit");
                self.del_tip = $translate.instant("aws.system.storagement.storageTranslate.usingLimitDelete");
            }
            // if(values[0].storageFirm == "ceph") {
            //     self.canDel = false;
            //     self.del_tip = "超融合ceph存储不允许删除";
            // }
            if(values[0].migrateGlanceStatus == "1") {
                self.canDel = false;
                self.del_tip =$translate.instant("aws.system.storagement.storageTranslate.imageLimitDelete");
            }else if(values[0].migrateGlanceStatus == "2") {
                self.canDel = false;
                self.del_tip =$translate.instant("aws.system.storagement.storageTranslate.transferImage");
            }else if(values[0].migrateGlanceStatus == "3") {
                self.canDel = false;
                self.del_tip =$translate.instant("aws.system.storagement.storageTranslate.transferFailed");
            }

            if(values[0].storageFirm == "default") {
                self.canDel = false;
                self.del_tip = $translate.instant("aws.system.storagement.storageTranslate.customDelete");
            }
        }else {
            self.canEdit = false;
            self.canDel = false;
        }
    });

    //创建和编辑弹出框，editData是当前被选中的值
    function openStorageModel(type) {
        var editData = angular.copy(self.editData);
        if(type == "new") {
            $uibModal.open({
                animation: true,
                templateUrl: "createStorageModel.html",
                controller: "storageController",
                resolve: {
                    type: function() {
                        return type;
                    },
                    editData: function() {
                        return editData;
                    },
                    storageNameList: function() {
                        return self.storageNameList;
                    },
                    backupCount: function() {
                        return self.backupCount;
                    },
                    storageCephCount: function() {
                        return self.storageCephCount;
                    },
                    initStorageTable: function() {
                        return initTabData;
                    },
                    showLoading: function() {
                        return showLoading;
                    },
                    hideLoading: function() {
                        return hideLoading;
                    }
                }
            });
        }else if(type == "edit") {
            if(!self.canEdit) {
                return;
            }
            $uibModal.open({
                animation: true,
                templateUrl: "updateStorageModel.html",
                controller: "storageController",
                resolve: {
                    type: function() {
                        return type;
                    },
                    editData: function() {
                        return editData;
                    },
                    storageNameList: function() {
                        return self.storageNameList;
                    },
                    initStorageTable: function() {
                        return initTabData;
                    },
                    backupCount: function() {
                        return self.backupCount;
                    },
                    storageCephCount: function() {
                        return self.storageCephCount;
                    },
                    showLoading: function() {
                        return showLoading;
                    },
                    hideLoading: function() {
                        return hideLoading;
                    }
                }
            });
        }
    }

    //删除操作
    function deleteStorage(checkedItems) {
        if(!self.canDel) {
            return;
        }
        var content = {
            target: "delStorage",
            msg: "<span>" + $translate.instant("aws.system.storagement.deleteTip") + "</span>",
            data: checkedItems
        };
        self.$emit("delete", content);
    };
    self.$on("delStorage", function(e, data) {
        var params = {
            id: data[0].id,
            storageUse: data[0].use,
            storageFirm: data[0].storageFirm,
            volumeBackendName: data[0].volumeBackendName,
            regionKey: localStorage.regionKey
        }
        var loginData = angular.fromJson(localStorage.$LOGINDATA);
        var regionUid = loginData.regionUid;
        var enterpriseUid = localStorage.enterpriseUid;
        storageManagementSrv.deleteStorageData(enterpriseUid, regionUid, params).then(function(result) {
            if(result && result.status == "0") {
                //var tip = "删除存储需要重启存储服务，会影响云平台存储相关的操作，但不影响已有云主机正常对外提供业务，请耐心等待。。。";
                var tip = $translate.instant("aws.system.storagement.delstorageMessage");
                showLoading(tip, "delete");
            }else {
                if(result && result.code == "01080305") {
                    alert.set("", $translate.instant("aws.system.storagement.storageTranslate.clusterLimitOperation"), "error", 5000);
                }
            }
        });
    });

    //详情页面
    $scope.$on("getDetail", function(event, value) {
        self.detailData = {};
        storageManagementSrv.getStorageDetail(value).then(function(result) {
            if($routeParams.id != value) {
                return;
            }
            if(result && result.data) {
                if(result.data.use == "0" || result.data.use == "2") {
                    if(result.data.type) {
                        if(result.data.type == "UDS-Stor 3000G2-24R2") {
                            result.data.type = self.manuName["ruijie"] + "（" + result.data.type + "）";
                        }else {
                            result.data.type = self.manuName[result.data.storageFirm] + "（" + result.data.type + "）";
                        }
                    }else {
                        result.data.type = self.manuName[result.data.storageFirm];
                    }
                }
                if(result.data.allocatedCapacity != null && !isNaN(result.data.allocatedCapacity)) {
                    result.data.allocatedCapacity = result.data.allocatedCapacity.toFixed(2);
                }
                if(!isNaN(result.data.totalCapacity)) {
                    result.data.totalCapacity = result.data.totalCapacity.toFixed(2);
                    if(!isNaN(result.data.freeCapacity)) {
                        result.data.usedCapacity = (result.data.totalCapacity - result.data.freeCapacity).toFixed(2);
                    }
                }
                self.detailData = {
                    name: result.data.name,
                    use: result.data.use,
                    device: result.data.type,
                    description: result.data.description,
                    usedCapacity: result.data.usedCapacity || "",
                    allocatedCapacity: result.data.allocatedCapacity,
                    totalCapacity: result.data.totalCapacity,
                    maxUsedCapacity: result.data.maxUsedCapacity,
                    Addr: result.data.diskPath || "",
                    // nfsAddr: result.data.nfsIp || "",
                    // nfsPath: result.data.dir || "",
                    createTime: result.data.createTime
                }
            }
        });
    });

}]);

// 添加&编辑  存储
storageManagementModule.controller('storageController', ["$scope", "$translate", "$location", "$timeout", "$uibModal", "$uibModalInstance", "NgTableParams",
    "type", "editData", "storageNameList", "backupCount", "initStorageTable", "showLoading", "hideLoading", "storageManagementSrv", "alertSrv", "checkedSrv", "newCheckedSrv",
    "storageCephCount", function($scope, $translate, $location, $timeout, $uibModal, $uibModalInstance, NgTableParams, type, editData, storageNameList, backupCount, initStorageTable,
    showLoading, hideLoading, storageManagementSrv, alertSrv, checkedSrv, newCheckedSrv, storageCephCount) {
    var self = $scope;
    var nodeMapList = {};
    self.submitValid = false;
    self.nfsAddrValid = false;
    self.manageAddrValid = false;
    self.isEnabledArbiter = localStorage.isEnabledArbiter == "true" ? true : false;

    self.storageUseList = [
        { 
            id:"1",
            name:$translate.instant("aws.system.storagement.storageTranslate.instanceBackupsPool")
        }, { 
            id:"0",
            name:$translate.instant("aws.system.storagement.storageTranslate.instancePool")
        }];

    // self.storageTypeList = [
    //     { 
    //         id:"0",
    //         name:"预定义存储"
    //     }, { 
    //         id:"1",
    //         name:"自定义存储"
    //     }];

    self.storageDeviceList = [
        { 
            id:"NFS",
            name:"NFS"
        }, { 
            id:"ceph",
            name:"ceph"
        }];

    self.manufacturerList = [
        {
            id:"insideCeph",
            name:$translate.instant("aws.system.storagement.storageEnumeration.insideCeph")
        }, {
            id:"outsideCeph",
            name:$translate.instant("aws.system.storagement.storageEnumeration.outsideCeph")
        }, {
            id:"toyou",
            name:$translate.instant("aws.system.storagement.storageEnumeration.toyou")
        }, {
            id:"ruijie",
            name:$translate.instant("aws.system.storagement.storageEnumeration.ruijie")
        }, {
            id:"iscsi",
            name:$translate.instant("aws.system.storagement.storageEnumeration.iscsi")
        }, {
            id:"fc",
            name:$translate.instant("aws.system.storagement.storageEnumeration.fc")
        }, {
            id:"nfs",
            name:"NFS"
        }];

    // 两节点软件交付模式不能对接超融合
    if(localStorage.isEnabledArbiter == "true" && localStorage.isCustom == "false") {
        self.manufacturerList.splice(0, 1);
    }
    
    // ceph存储只能对接一次
    if(storageCephCount > 0) {
        self.manufacturerList = self.manufacturerList.filter(item => !(item.id == "insideCeph" || item.id == "outsideCeph"));
    }

    self.ruijieDeviceList = [
        { 
            id:"UDS-Stor 3000G2-24R2",
            name:"UDS-Stor 3000G2-24R2"
        }, { 
            id:"UDS-Stor 3000-C01",
            name:"UDS-Stor 3000-C01"
        }];

    self.ruijieProtocolList = [
        { 
            id:"ISCSI",
            name:"ISCSI"
        }, { 
            id:"FC",
            name:"FC"
        }];

    self.toyouDeviceList = [
        { 
            id:"NetStor NCS7500G2",
            name:"NetStor NCS7500G2"
        }];

    self.toyouProtocolList = [
        { 
            id:"FC",
            name:"FC"
        }];

    self.copyList = [
        {id: "2", name: "2"},
        {id: "3", name: "3"}
    ]

    self.backupShow = true;
    self.backupNfsShow = true;
    self.R2Show = true;
    self.C01Show = false;
    self.ISCSIShow = true;
    self.FCShow = false;
    self.nfsPathShow = false;

    self.inStepOne = true;
    self.inStepTwo = false;
    self.inStepThree = false;
    self.inStepOneBar = true;
    self.inStepTwoBar = false;
    self.inStepThreeBar = false;

    self.poolUnique = false;
    self.nfsAddrClick = false;
    self.manageAddrClick = false;
    self.nfsAddrCheck = false;
    self.checkAddrSuccess = false;
    self.checkAddrTipShow = false;
    self.checkNfsTipShow = false;
    self.checkNfsLoadingShow = false;
    self.checkAddrLoadingShow = false;
    self.nameCheck = false;
    self.configFileCheck = false;
    self.privilegeFileCheck = false;

    self.manageAddrCount = 0;
    self.nfsAddrCount = 0;

    self.poolList = [];
    self.ruijiePoolList = [];
    self.nfsPathList = [];
    self.selected_file = "";
    self.selected_privilegeFile = "";
    self.changeUse = changeUse;
    self.changeDevice = changeDevice;
    self.changeType = changeType;
    self.checkName = checkName;

    // self.$on("checkNfsSuccess", function(e, data) {
    //     var data = angular.fromJson(data);
    //     self.nfsPathShow = true;
    //     self.nfsAddrClick = false;
    //     self.nfsAddrCheck = false;
    //     self.nfsAddrCheckSuccess = true;
    //     self.checkNfsLoadingShow = false;
    //     self.nfsPathList = [];
    //     data.map(item => {
    //         self.nfsPathList.push(
    //             {id: item.share_dir.split(" ")[0], name: item.share_dir}
    //         )
    //     })
    //     self.storage.nfs.nfsPath = self.nfsPathList[0];
    //     self.storage.backup.nfsPath = self.nfsPathList[0];
    //     self.$apply();
    // });

    // self.$on("checkNfsFiled", function(e, data) {
    //     self.checkNfsTipShow = true;
    //     self.nfsAddrClick = false;
    //     self.checkNfsLoadingShow = false;
    //     self.checkNfsTip = "NFS服务器验证失败";
    //     self.$apply();
    // });

    self.$on("checkIpSuccess", function(e, data) {
        self.manageAddrClick = false;
        self.checkAddrSuccess = true;
        self.checkAddrTipShow = true;
        self.checkAddrLoadingShow = false;
        self.checkAddrTip = $translate.instant("aws.system.storagement.storageTranslate.manangeAddressConnected");
        self.$apply();
    })

    self.$on("checkIpFailed", function(e, data) {
        self.manageAddrClick = false;
        self.checkAddrSuccess = false;
        self.checkAddrTipShow = true;
        self.checkAddrLoadingShow = false;
        self.checkAddrTip = $translate.instant("aws.system.storagement.storageTranslate.manangeAddressUnconnected");
        self.$apply();
    })

    self.confFileChange = function() {
        self.selected_file = document.getElementById("uploadConf").value;
        let dom = document.getElementById("uploadConf");
        var file = dom.files[0];
        let fileSize = 0;
        var fileType = "";
        file ? fileSize = file.size:self.selected_file="";
        file ? fileType = file.name.substr(-5,5):fileType=".conf";
        var reg = new RegExp("^[^\u4e00-\u9fa5\\s]{0,}$");
        var fileNameCheck = true;
        if(file && file.name) {
            fileNameCheck = reg.test(file.name);
        }
        if(fileType ==".conf" && fileSize < 1048576 && fileNameCheck) {
            self.configFileCheck = false;
        }else{
            self.configFileCheck = true;
        }
        self.$apply();
    }

    self.privilegeFileChange = function() {
        self.selected_privilegeFile = document.getElementById("uploadPrivilege").value;
        let dom = document.getElementById("uploadPrivilege");
        var file = dom.files[0];
        let fileSize = 0;
        var fileType = "";
        file ? fileSize = file.size:self.selected_privilegeFile="";
        file ? fileType = file.name.substr(-8,8):fileType=".keyring";
        var reg = new RegExp("^[^\u4e00-\u9fa5\\s]{0,}$");
        var fileNameCheck = true;
        if(file && file.name) {
            fileNameCheck = reg.test(file.name);
        }
        if(fileType ==".keyring" && fileSize < 1048576 && fileNameCheck) {
            self.privilegeFileCheck = false;
        }else{
            self.privilegeFileCheck = true;
        }
        self.$apply();
    }

    self.stepToTwo = function() {
        if(self.createStorageForm.$valid && !self.nameCheck) {
            if(self.storage.manufacturer.id =='nfs' && !self.storage.nfs.nfsPath) {
                self.checkNfsTip = $translate.instant("aws.system.storagement.storageTranslate.nfsTips");
                self.checkNfsTipShow = true;
                self.nfsAddrCount = 1;
                return;
            }
            if(self.storage.manufacturer.id =='ruijie') {
                if(self.poolUnique) {
                    return;
                }
                if(!self.checkAddrSuccess) {
                    if(!self.checkAddrTipShow) {
                        self.checkAddrTip = $translate.instant("aws.system.storagement.storageTranslate.manageIpCheck");
                        self.checkAddrTipShow = true;
                        self.manageAddrCount = 1;
                    }
                    return;
                }
            }
            if(self.storage.manufacturer.id == "outsideCeph" && (self.privilegeFileCheck || self.configFileCheck)) {
                return;
            }
            if(self.storage.manufacturer.id=='fc'){
                localStorage.removeItem('nodeConfig');
                self.inStepNode = false;
                if(self.checkboxestableDiskNodes){
                   self.checkboxestableDiskNodes.items={};
                }
                self.stateMachine ={
                    cardDisable:true,
                    configDisable:true,
                    netTestDisable:true,
                    disksDisable:true,
                    fcDisksDisable:true
                };
            }else{
                localStorage.removeItem('cephDiskConfig');
                self.inStepNode = true;
                nodeMapList = {};
                if(self.checkboxesmanageStorageNodes){
                   self.checkboxesmanageStorageNodes.items={};
                }
                self.stateMachine ={
                    cardDisable:true,
                    configDisable:true,
                    netTestDisable:true,
                    disksDisable:true,
                    fcDisksDisable:true
                };
            }
            self.inStepOne = false;
            self.inStepTwo = true;
            self.inStepTwoBar = true;
        }else {
            self.submitValid = true;
        }
    }
    self.backStoNode = function(){
        if(self.insideCephShow){
            self.getback()
        }else{
            self.showType ='stor';
            self.inStepNode = false;       
        }
        
    }
    //第二步到第一步
    self.stepToOne = function() {
        self.showType='stor'
        self.inStepOne = true;
        self.inStepTwo = false;
        self.inStepTwoBar = false;
    }
    //第二步到第三步
    self.stepToThree = function() {
        self.getback()
        storageManagementSrv.getStorageIp(localStorage.regionKey).then(function(res){
            if(res&&res.data){
                var storageIpRangeArr = res.data.filter(item=>{
                    return item.name == 'storage';
                })
                var storageCidr = storageIpRangeArr[0].cidr;
                if(storageCidr != self.twoModule.storageCidr) {
                    alertSrv.set("", $translate.instant("aws.system.storagement.storageTranslate.sendNetworkConfig"), "error", 5000);
                    return;
                }else {
                    self.inStepThree = true;
                    self.inStepTwo = false;
                    self.inStepThreeBar = true;
                }
            }
        });
    }
    //第三步到第二步
    self.stepThreeToTwo = function() {
        self.inStepThree = false;
        self.inStepTwo = true;
        self.innodeConfig = true;
        self.inStepThreeBar = false;
    }

    self.changeManufacturer = function(obj) {
        var manu = obj.id + "Show";
        var itemList = ["insideCephShow", "outsideCephShow", "nfsShow", "iscsiShow", "fcShow", "ruijieShow", "toyouShow"];
        itemList.forEach(function(item) {
            if(item == manu) {
                self[item] = true;
            }else {
                self[item] = false;
            }
        });
        self.checkAddrSuccess = false;
        self.checkAddrTipShow = false;
        if(obj.id == "iscsi") {
            self.storageStepOne = false;
            self.storageStepTwo = false;
            self.storageStepThree = true;
        }else if(obj.id == "toyou") {
            self.storageStepOne = true;
            self.storageStepTwo = false;
            self.storageStepThree = false;
        }else {
            self.storageStepOne = false;
            self.storageStepTwo = true;
            self.storageStepThree = false;
        }
    }
    self.changeManufacturer(self.manufacturerList[0]);

    self.changeRuijieDevice = function(obj) {
        if(obj.id == "UDS-Stor 3000G2-24R2") {
            self.R2Show = true;
            self.C01Show = false;
            self.checkPoolExist();
        } else if(obj.id == "UDS-Stor 3000-C01") {
            self.R2Show = false;
            self.C01Show = true;
            self.checkPoolExist();
        }
        self.changeManageAddr();
    }

    self.changeRuijieProtocol = function(obj) {
        if(obj.id == "ISCSI") {
            self.ISCSIShow = true;
            self.FCShow = false;
            self.storageStepOne = false;
            self.storageStepTwo = true;
            self.storageStepThree = false;
        } else if(obj.id == "FC") {
            self.ISCSIShow = false;
            self.FCShow = true;
            self.storageStepOne = true;
            self.storageStepTwo = false;
            self.storageStepThree = false;
        }
    }

    self.changeNfsAddr = function() {
        self.nfsPathShow = false;
        self.checkNfsTipShow = false;
        self.storage.nfs.nfsPath = "";
        self.storage.backup.nfsPath = "";
    }

    self.changeManageAddr = function() {
        self.checkAddrSuccess = false;
        self.checkAddrTipShow = false;
    }

    //验证管理地址是否连通 (结果通过推送消息处理)
    self.checkManageAddr = function() {
        if( (self.storage.manufacturer.id == "ruijie" && self.storage.ruijie.device.id == "UDS-Stor 3000-C01" && self.createStorageForm.ctrl1_0.$valid
            && self.createStorageForm.ctrl1_1.$valid && self.createStorageForm.ctrl1_2.$valid && self.createStorageForm.ctrl1_3.$valid
            && self.createStorageForm.ctrl2_0.$valid && self.createStorageForm.ctrl2_1.$valid && self.createStorageForm.ctrl2_2.$valid
            && self.createStorageForm.ctrl2_3.$valid ) || (self.createStorageForm.ip_0 && self.createStorageForm.ip_0.$valid && self.createStorageForm.ip_1.$valid
            && self.createStorageForm.ip_2.$valid && self.createStorageForm.ip_3.$valid) ){
            self.manageAddrClick = true;
            self.manageAddrCount = 1;
            self.checkAddrTipShow = false;
            self.checkAddrLoadingShow = true;
            var params = {
                regionkey: localStorage.regionKey
            }
            if(self.storage.manufacturer.id == "ruijie") {
                if(self.storage.ruijie.device.id == "UDS-Stor 3000G2-24R2") {
                    var ipAddr = self.storage.ruijie.ip_0 + "." + self.storage.ruijie.ip_1 + "." + self.storage.ruijie.ip_2 + "." + self.storage.ruijie.ip_3;
                    params.ips = [ipAddr];
                }else if(self.storage.ruijie.device.id == "UDS-Stor 3000-C01") {
                    var ctrl1 = self.storage.ruijie.ctrl1_0 + "." + self.storage.ruijie.ctrl1_1 + "." + self.storage.ruijie.ctrl1_2 + "." + self.storage.ruijie.ctrl1_3;
                    var ctrl2 = self.storage.ruijie.ctrl2_0 + "." + self.storage.ruijie.ctrl2_1 + "." + self.storage.ruijie.ctrl2_2 + "." + self.storage.ruijie.ctrl2_3;
                    params.ips = [ctrl1, ctrl2];
                }
            }else if(self.storage.manufacturer.id == "toyou") {
                var ipAddr = self.storage.toyou.ip_0 + "." + self.storage.toyou.ip_1 + "." + self.storage.toyou.ip_2 + "." + self.storage.toyou.ip_3;
                params.ips = [ipAddr];
            }
            storageManagementSrv.checkManageAddr(params).then(function(result) {
                if(result && result.status == "0") {
                    
                }
            });
        }else {
            self.manageAddrValid = true;
        }
    }

    //验证nfs地址
    self.checkNfsAddr = function() {
        if(self.createStorageForm.ip_0.$valid && self.createStorageForm.ip_1.$valid && self.createStorageForm.ip_2.$valid && self.createStorageForm.ip_3.$valid) {
            self.nfsAddrCount = 1;
            self.checkNfsTipShow = false;
            self.nfsPathShow = false;
            var ipAddr = "";
            if(self.storage.use.id == "0") {
                ipAddr = self.storage.nfs.ip_0 + "." + self.storage.nfs.ip_1 + "." + self.storage.nfs.ip_2 + "." + self.storage.nfs.ip_3;
            }else {
                ipAddr = self.storage.backup.ip_0 + "." + self.storage.backup.ip_1 + "." + self.storage.backup.ip_2 + "." + self.storage.backup.ip_3;
            }
            var params = {
                regionkey: localStorage.regionKey, 
                ip: ipAddr
            }
            storageManagementSrv.checkNfsAddr(params).then(function(result) {
                if(result && result.data && angular.isArray(result.data)) {
                    if(result.data.length) {
                        self.nfsPathList = [];
                        result.data.map(item => {
                            self.nfsPathList.push(
                                {id: item.split(" ")[0], name: item}
                            )
                        })
                        self.nfsPathHolder = $translate.instant("aws.system.storagement.selectNfsPath");
                        self.nfsAddrCheckSuccess = true;
                        self.storage.nfs.nfsPath = self.nfsPathList[0];
                        self.storage.backup.nfsPath = self.nfsPathList[0];
                    }else {
                        self.nfsPathList = "";
                        self.nfsPathHolder = $translate.instant("aws.system.storagement.noNfsPath");
                    }
                    self.nfsPathShow = true;
                    self.nfsAddrCheck = false;
                }
            });
        }else {
            self.nfsAddrValid = true;
        }
    }

    //校验存储池是否已存在
    self.checkPoolExist = function() {
        if(self.storage.manufacturer.id == "ruijie" || self.storage.manufacturer.id == "toyou") {
            var item = "";
            var poolList = self.poolList;
            if(self.storage.manufacturer.id == "toyou") {
                item = self.storage.toyou.pool;
            }else {
                item = self.storage.ruijie.pool;
            }

            if(self.storage.manufacturer.id == "ruijie" && self.storage.ruijie.device.id == "UDS-Stor 3000-C01") {
                poolList = self.ruijiePoolList;
            }

            if(poolList.indexOf(item) > -1) {
                self.poolUnique = true;
            }else {
                self.poolUnique = false;
            }
        }else {
            self.poolUnique = false;
        }
    }

    /*通用ISCSI*/
    self.targetTab = true;
    self.loginDisabled = true;
    self.confirmIscsi = false;
    self.splitIscsi = function(item) {
        return item.split(":")[0] + ":" + item.split(":")[1];
    }
    self.discoveryTarget = function() {
        self.targetTab = true;
        self.loginDisabled = true;
        self.confirmIscsi = false;
        if(self.storage.iscsi.chap) {
            var option = {
                username: self.storage.iscsi.userName || "null",
                password: self.storage.iscsi.password || "null",
                usernameIn: self.storage.iscsi.userName2 || "null",
                passwordIn: self.storage.iscsi.password2 || "null",
                ipAndPort: self.storage.iscsi.serverIp + ":" + self.storage.iscsi.port
            }
            storageManagementSrv.restartIscsi(option).then(function(result) {
                if(result && result.status == "0") {
                    self.showIscsiLoading = true;
                }
            });
        }else {
            var params = {
                ipAndPort: self.storage.iscsi.serverIp + ":" + self.storage.iscsi.port
            }
            storageManagementSrv.discoveryIscsi(params).then(function(result) {
                if(result && result.status == "0") {
                    self.showIscsiLoading = true;
                }
            });
        }
    }

    self.targetList = [];
    self.$on("discoveryIscsiSuccess", function(e, data) {
        var data = data.replace("run.script.discovery_iscsi_target.py.success.", "");
        self.targetList = angular.fromJson(data);
        self.showIscsiLoading = false;
        var disIscsiSuc = true;
        for(var i = 0; i < self.targetList.length; i++) {
            if(self.targetList[i].retcode != "0") {
                disIscsiSuc = false;
                break;
            }
        }
        if(disIscsiSuc) {
            self.loginDisabled = false;
        }
        self.$apply();
    });

    self.$on("discoveryIscsiFailed", function(e, data) {
        self.showIscsiLoading = false;
        alertSrv.set("", $translate.instant("aws.system.storagement.storageTranslate.findTargetFail"), "error", 5000);
        self.$apply();
    });

    self.confirmDevice = function() {
        self.targetTab = false;
        self.confirmIscsi = false;
        self.loginIscsiFailed = false;
        self.iscsiDeviceList = [];
        var regionKey = localStorage.regionKey;
        var targetInfo = [];
        self.targetList.forEach(function(item, index) {
            var obj = {
                nodeName: item.node_name,
                ipAndPort: item.host_port,
                iqn: item.msg.split(" ")[1]
            }
            targetInfo.push(obj);
        });
        storageManagementSrv.loginIscsi(regionKey, targetInfo).then(function(result) {
            if(result && result.status == "0"){
                self.showIscsiLoading = true;
            }
        });
    }

    self.$on("loginIscsiSuccess", function(e, data) {
        if(self.loginIscsiFailed) {
            return;
        }
        var data = data.replace("run.script.fetch_iscsi_disk_list.py.success.", "");
        self.iscsiDeviceList.push(angular.fromJson(data));
        if(self.iscsiDeviceList.length < self.targetList.length) {
            return;
        }
        self.iscsiDeviceListAll = angular.copy(self.iscsiDeviceList);
        self.iscsiDeviceListAll.forEach(function(item, index) {
            if(angular.isArray(item.msg) && item.msg.length > 0) {
                item.msg.map((item2,index2) => {
                    if(item2.indexOf("sd") == 0) {

                    }else {
                        item.msg[index2] = "mapper/" + item2
                    }
                });
                item.selectInfo = item.msg[0];
                item.repeatMsg = item.msg.slice(1);
            }
        });
        self.showIscsiLoading = false;
        self.confirmIscsi = true;
        for(var i = 0; i < self.iscsiDeviceListAll.length; i++) {
            if(self.iscsiDeviceListAll[i].retcode != "0") {
                self.confirmIscsi = false;
                break;
            }
        }
    });

    self.$on("loginIscsiFailed", function(e, data) {
        if(self.loginIscsiFailed) {
            return;
        }
        alertSrv.set("", $translate.instant("aws.system.storagement.storageTranslate.iscsiTips"), "error", 5000);
        self.loginIscsiFailed = true;
        self.showIscsiLoading = false;
        self.$apply();
    });

    if(type == "new") {
        self.modalTitle = $translate.instant("aws.system.storagement.addTitle");
        self.stoNameList = storageNameList;
        self.storage = {
            name: "",
            use: self.storageUseList[0],
            manufacturer: self.manufacturerList[0]
        }

        self.storage.backup = {
            device: self.storageDeviceList[0],
            backupDes: "",
            ip_0: "",
            ip_1: "",
            ip_2: "",
            ip_3: "",
            nfsPath: "",
            backupUser: "",
            backupPool: ""
        }

        self.storage.ruijie = {
            device: self.ruijieDeviceList[0],
            protocol: self.ruijieProtocolList[0],
            ip_0: "",
            ip_1: "",
            ip_2: "",
            ip_3: "",
            ctrl1_0: "",
            ctrl1_1: "",
            ctrl1_2: "",
            ctrl1_3: "",
            ctrl2_0: "",
            ctrl2_1: "",
            ctrl2_2: "",
            ctrl2_3: "",
            userName: "",
            password: "",
            pool: "",
            ctrl1Business: "",
            ctrl2Business: "",
            description: ""
        }

        self.storage.toyou = {
            device: self.toyouDeviceList[0],
            protocol: self.toyouProtocolList[0],
            ip_0: "",
            ip_1: "",
            ip_2: "",
            ip_3: "",
            userName: "",
            password: "",
            pool: "",
            description: ""
        }

        self.storage.nfs = {
            description: "",
            ip_0: "",
            ip_1: "",
            ip_2: "",
            ip_3: "",
            nfsPath: ""
        }

        self.storage.iscsi = {
            serverIp: "",
            port: "3260",
            chap: false,
            userName: "",
            password: "",
            chap_in: false,
            userName2: "",
            password2: ""
        }

        self.storage.inCeph = {
            copies: self.copyList[0]
        }

        self.storage.outCeph = {
            description: "",
            user: "",
            pool: ""
        }

        self.storage.fc = {
            multipath: false
        }

        self.$watch(function(){
            return self.storage.iscsi.chap;
        },function(value){
            if(!value) {
                self.storage.iscsi.chap_in = false;
                self.storage.iscsi.userName = "";
                self.storage.iscsi.password = "";
                self.storage.iscsi.userName2 = "";
                self.storage.iscsi.password2 = "";
            }else {
                
            }
        });

        self.$watch(function(){
            return self.storage.iscsi.chap_in;
        },function(value){
            if(!value) {
                self.storage.iscsi.userName2 = "";
                self.storage.iscsi.password2 = "";
            }else {
                
            }
        });

        if(backupCount > 0) {
            self.storageUseList = [
                { 
                    id:"0",
                    name:$translate.instant("aws.system.storagement.storageTranslate.instancePool")
                }];
            self.storage.use = self.storageUseList[0];
            changeUse(self.storage.use);
        }
        changeDevice(self.storageDeviceList[0]);
        getPoolList();
        self.storageConfirm = function(check) {
            if(self.createStorageForm.$valid && !self.nameCheck) {
                var time = new Date().getTime();
                var loginData = angular.fromJson(localStorage.$LOGINDATA);
                var regionUid = loginData.regionUid;
                var params  =  {
                    name: self.storage.name,             //名称
                    storageUse: self.storage.use.id,     //存储用途
                    storageType: "0",                    //存储类型
                    regionKey: localStorage.regionKey,
                    regionUid: regionUid,
                    enterpriseUid: localStorage.enterpriseUid

                }
                if(self.storage.use.id == "0") { //云主机后端
                    // 检查是否修改了存储网
                    storageManagementSrv.getStorageIp(localStorage.regionKey).then(function(res){
                        var ipChangeStatus = 0;
                        if(res&&res.data){
                            var storageIpRangeArr = res.data.filter(item=>{
                                return item.name == 'storage';
                            })
                            var storageCidr = storageIpRangeArr[0].cidr;
                            if(storageCidr != self.twoModule.storageCidr) {
                                ipChangeStatus = 1;
                                alertSrv.set("",$translate.instant("aws.system.storagement.storageTranslate.sendNetworkConfig"), "error", 5000);
                            }
                            return ipChangeStatus;
                        }
                    }).then(function(status) {
                        if(status == 1) {
                            return;
                        }
                        self.storage_type = "";
                        if(self.storage.manufacturer.id == "outsideCeph") {
                            var form = document.forms.namedItem("createStorageForm");
                            var oData = new FormData(form);
                            oData.append("enterpriseUid", params.enterpriseUid);
                            oData.append("regionUid", params.regionUid);
                            oData.append("regionKey", params.regionKey);
                            oData.append("storageUse", params.storageUse);
                            oData.append("storageType", "1");
                            oData.append("storageFirm", "out_ceph");
                            // oData.append("storageDevice", "out_ceph");
                            oData.append("storageName", "ceph_" + time);
                            oData.append("volumeBackendName", "out_ceph#volumes");
                            oData.append("storagePool", self.storage.outCeph.pool);
                            
                            var option = {
                                volume_backend_name: "out_ceph#volumes",
                                rbd_user: self.storage.outCeph.user,
                                rbd_pool: self.storage.outCeph.pool
                            }
                            var storageConfiguration = angular.toJson(option);
                            oData.append("storageConfiguration", storageConfiguration);
                            var oReq = new XMLHttpRequest();
                            oReq.onerror = function(e) {
                                hideLoading();
                                if(e.type == "error") {
                                    alertSrv.set("", $translate.instant("aws.system.storagement.storageTranslate.addFail"), "error", 5000);
                                }
                            };
                            oReq.onload = function(e) {
                                var responseObj = JSON.parse(oReq.responseText);
                                if(responseObj) {
                                    if(responseObj.code == 0) {
                                        
                                    }else {
                                        hideLoading();
                                        if(responseObj.code == "01080305") {
                                            alertSrv.set("", $translate.instant("aws.system.storagement.storageTranslate.clusterLimitOperation"), "error", 5000);
                                        }
                                    }
                                }
                            }
                            oReq.open("POST", window.GLOBALCONFIG.APIHOST.BASE + "/v1/storage/backup", true);
                            let auth_token = localStorage.$AUTH_TOKEN;
                            oReq.setRequestHeader("X-Auth-Token",auth_token);
                            oReq.send(oData);
                            var tip = $translate.instant("aws.system.storagement.addstorageMessage");
                            showLoading(tip, "add");
                            $uibModalInstance.close();
                        }else {
                            if(self.storage.manufacturer.id == "insideCeph") {
                                self.confirmInsideCeph = true;
                                for(var i = 0; i < self.stepOneData.length; i++) {
                                    let node_uid=self.stepOneData[i].nodeUid;
                                    if(!nodeMapList[node_uid]) {
                                        self.confirmInsideCeph = false;
                                        break;
                                    }else{
                                        if(!nodeMapList[node_uid].disk_config){
                                           self.confirmInsideCeph = false;
                                           break;
                                        }
                                    }
                                }
                                if(!self.confirmInsideCeph) {
                                    alertSrv.set("",$translate.instant("aws.system.storagement.storageTranslate.completeDiskConfig"), "error", 5000);
                                    return;
                                }
                                // params.storageDevice = "ceph";
                                params.storageFirm = "ceph";
                                params.storageType = "1";
                                params.volumeBackendName = "ceph_1#volumes";
                                var option = {};
                                option.common = {
                                    enable_ceph: true,
                                    enable_cephops: true,
                                    ceph_glance_pool_size: self.storage.inCeph.copies.id,
                                    ceph_nova_pool_size: self.storage.inCeph.copies.id,
                                    ceph_cinder_pool_size: self.storage.inCeph.copies.id
                                }
                                option.node = [];
                                self.stepOneData.forEach(function(item, index) {
                                    var obj = {};
                                    obj.nodeid = item.nodeUid;
                                    obj.hostname = item.hostName;
                                    obj.disk_config = [
                                        {
                                            ceph_osd: nodeMapList[item.nodeUid].disk_config,
                                            ceph_ssd: nodeMapList[item.nodeUid].disk_ssd_ceph,
                                            mode: "journal_collocation",
                                            root: ""
                                        }
                                    ];
                                    option.node.push(obj);
                                });
                                params.config = angular.toJson(option);
                            }else if(self.storage.manufacturer.id == "nfs") {
                                params.storageFirm = "nfs";
                                params.volumeBackendName = "nfs_" + time;
                                params.description = self.storage.nfs.description;
                                var nfsAddr = self.storage.nfs.ip_0 + "." + self.storage.nfs.ip_1 + "." + self.storage.nfs.ip_2 + "." + self.storage.nfs.ip_3;
                                params.diskPath = nfsAddr + ":" + self.storage.nfs.nfsPath.id;
                                var option = {
                                    storage_name: "nfs_" + time,
                                    storage_type: "nfs",
                                    nfs_mount_point_base: "mnt/nfs_" + time,
                                    nfs_shares_ip_dir: nfsAddr + ":" + self.storage.nfs.nfsPath.id,
                                    volume_backend_name: "nfs_" + time,
                                    additional_config_file: "nfs_shares_" + time,
                                    config_template_file: "nfs_shares.ctmpl"
                                }
                                params.storageConfiguration = angular.toJson(option);
                            }else if(self.storage.manufacturer.id == "iscsi") {
                                if(!self.confirmIscsi) {
                                    alertSrv.set("", $translate.instant("aws.system.storagement.storageTranslate.iscisEquipment"), "error", 5000);
                                    return;
                                }
                                self.checkIscsiId = true;
                                var iscsiId = self.iscsiDeviceListAll[0].selectInfo.split(":")[2];
                                for(var i = 0; i < self.iscsiDeviceListAll.length; i++) {
                                    if(self.iscsiDeviceListAll[i].selectInfo.split(":")[2] != iscsiId) {
                                        self.checkIscsiId = false;
                                        break;
                                    }
                                }
                                if(!self.checkIscsiId) {
                                    alertSrv.set("", $translate.instant("aws.system.storagement.storageTranslate.iscisReselect"), "error", 5000);
                                    return;
                                }
                                var iscsiDiskList = [];
                                var iscsiDiskInfo = {};
                                self.iscsiDeviceListAll.forEach(function(item, index) {
                                    iscsiDiskList.push(item.node_name);
                                    iscsiDiskInfo[item.node_name] = "/dev/" + item.selectInfo.split(":")[0];
                                });
                                params.storageFirm = "iscsi";
                                params.diskList = iscsiDiskList;
                                params.diskInfo = iscsiDiskInfo;
                                params.volumeBackendName = "iscsi_" + time;
                                params.description = "";
                                params.storage_name = "iscsi_" + time;
                                params.diskPath = self.storage.iscsi.serverIp + ":" + self.storage.iscsi.port;
                                params.hostPost = self.storage.iscsi.serverIp + ":" + self.storage.iscsi.port;
                                params.targetIqn = self.targetList[0].msg.split(" ")[1];
                            }else if(self.storage.manufacturer.id == "fc") {
                                self.confirmfc = true;
                                for(var i = 0; i < self.fcDiskData.length; i++) {
                                    if(!self.fcDiskData[i].disk_config) {
                                        self.confirmfc = false;
                                        break;
                                    }
                                }
                                if(!self.confirmfc) {
                                    alertSrv.set("",$translate.instant("aws.system.storagement.storageTranslate.completeDiskConfig"), "error", 5000);
                                    return;
                                }
                                var checkFcSize = true;
                                var size = self.fcDiskData[0].disk_speed;
                                for(var i = 0; i < self.fcDiskData.length; i++) {
                                    if(self.fcDiskData[i].disk_speed != size) {
                                        checkFcSize = false;
                                        break;
                                    }
                                }
                                if(!checkFcSize) {
                                    alertSrv.set("", $translate.instant("aws.system.storagement.storageTranslate.selectSameSize"), "error", 5000);
                                    return;
                                }
                                var checkFcUid = true;
                                var fcUid = self.fcDiskData[0].uid;
                                for(var i = 0; i < self.fcDiskData.length; i++) {
                                    if(self.fcDiskData[i].uid != fcUid) {
                                        checkFcUid = false;
                                        break;
                                    }
                                }
                                if(!checkFcUid) {
                                    alertSrv.set("",$translate.instant("aws.system.storagement.storageTranslate.fcTips"), "error", 5000);
                                    return;
                                }
                                var fcDiskList = [];
                                var fcDiskInfo = {};
                                self.fcDiskData.forEach(function(item, index) {
                                    fcDiskList.push(item.hostName);
                                    fcDiskInfo[item.hostName] = item.disk_config;
                                });
                                params.storageFirm = "fc";
                                params.diskList = fcDiskList;
                                params.diskInfo = fcDiskInfo;
                                params.volumeBackendName = "fc_" + time;
                                params.description = "";
                                params.storage_name = "fc_" + time;
                                // params.is_multipath = self.storage.fc.multipath? "1": "0";
                            }else if(self.storage.manufacturer.id == "ruijie") {
                                params.storageFirm = self.storage.manufacturer.id;
                                params.storageDevice = self.storage.ruijie.device.id;
                                params.storagePool = self.storage.ruijie.pool;
                                if(self.storage.ruijie.device.id == "UDS-Stor 3000G2-24R2") {
                                    if(self.poolUnique) {
                                        return;
                                    }
                                    if(!self.checkAddrSuccess) {
                                        if(!self.checkAddrTipShow) {
                                            self.checkAddrTip = $translate.instant("aws.system.storagement.storageTranslate.manageIpCheck");
                                            self.checkAddrTipShow = true;
                                            self.manageAddrCount = 1;
                                        }
                                        return;
                                    }
                                    //params.volumeBackendName = "NCS7500G2--" + self.storage.ruijie.pool;
                                    params.volumeBackendName = "ruijie_toyou_" + time;
                                    var ipAddr = self.storage.ruijie.ip_0 + "." + self.storage.ruijie.ip_1 + "." + self.storage.ruijie.ip_2 + "." + self.storage.ruijie.ip_3;
                                    var option = {
                                        storage_name: "ruijie_toyou_" + time,
                                        storage_type: "ruijie_toyou",
                                        san_ip: ipAddr,
                                        san_login: self.storage.ruijie.userName,
                                        san_password: self.storage.ruijie.password,
                                        storwize_svc_volpool_name: self.storage.ruijie.pool,
                                        //volume_backend_name: "NCS7500G2--" + self.storage.ruijie.pool
                                        volume_backend_name:"ruijie_toyou_" + time
                                    }
                                    if(self.storage.ruijie.protocol.id == "ISCSI") {
                                        option.volume_driver = "cinder.volume.drivers.toyou.storwize_svc.storwize_svc_iscsi.StorwizeSVCISCSIDriver";
                                    }else if(self.storage.ruijie.protocol.id == "FC") {
                                        option.volume_driver = "cinder.volume.drivers.toyou.storwize_svc.storwize_svc_fc.StorwizeSVCFCDriver";
                                    }
                                    params.diskPath = ipAddr;
                                    params.storageConfiguration = angular.toJson(option);
                                    params.description = self.storage.ruijie.description;
                                    self.storage_type = "toyou";
                                }else if(self.storage.ruijie.device.id == "UDS-Stor 3000-C01") {
                                    if(self.poolUnique) {
                                        return;
                                    }
                                    if(!self.checkAddrSuccess) {
                                        if(!self.checkAddrTipShow) {
                                            self.checkAddrTip = $translate.instant("aws.system.storagement.storageTranslate.manageIpCheck");
                                            self.checkAddrTipShow = true;
                                            self.manageAddrCount = 1;
                                        }
                                        return;
                                    }
                                    params.volumeBackendName = "ruijie_" + self.storage.ruijie.pool + "_" + time;
                                    var ctrl1 = self.storage.ruijie.ctrl1_0 + "." + self.storage.ruijie.ctrl1_1 + "." + self.storage.ruijie.ctrl1_2 + "." + self.storage.ruijie.ctrl1_3;
                                    var ctrl2 = self.storage.ruijie.ctrl2_0 + "." + self.storage.ruijie.ctrl2_1 + "." + self.storage.ruijie.ctrl2_2 + "." + self.storage.ruijie.ctrl2_3;
                                    var option = {
                                        storage_name: "ruijie_" + time,
                                        storage_type: "ruijie",
                                        storage_device_sp1: ctrl1,
                                        storage_device_sp2: ctrl2,
                                        storage_device_username: self.storage.ruijie.userName,
                                        storage_device_passwd: self.storage.ruijie.password,
                                        volume_backend_pools: self.storage.ruijie.pool,
                                        volume_backend_name: "ruijie_" + self.storage.ruijie.pool + "_" + time,
                                        additional_config_file: "cinder_macrosan_" + time + ".xml",
                                        config_template_file: "cinder_macrosan.xml.ctmpl"
                                    }
                                    if(self.storage.ruijie.protocol.id == "ISCSI") {
                                        option.volume_driver = "cinder.volume.drivers.macrosan.driver.MacroSANISCSIDriver";
                                        option.client_list_sp1 = self.storage.ruijie.ctrl1Business;
                                        option.client_list_sp2 = self.storage.ruijie.ctrl2Business;
                                    }else if(self.storage.ruijie.protocol.id == "FC") {
                                        option.volume_driver = "cinder.volume.drivers.macrosan.driver.MacroSANFCDriver";
                                    }
                                    params.diskPath = ctrl1 + "/" + ctrl2;
                                    params.storageConfiguration = angular.toJson(option);
                                    params.description = self.storage.ruijie.description;
                                }
                            }else if(self.storage.manufacturer.id == "toyou") {
                                if(self.poolUnique) {
                                    return;
                                }
                                if(!self.checkAddrSuccess) {
                                    if(!self.checkAddrTipShow) {
                                        self.checkAddrTip = $translate.instant("aws.system.storagement.storageTranslate.manageIpCheck");
                                        self.checkAddrTipShow = true;
                                        self.manageAddrCount = 1;
                                    }
                                    return;
                                }
                                params.storageFirm = self.storage.manufacturer.id;
                                params.storageDevice = self.storage.toyou.device.id;
                                params.volumeBackendName = "NCS7500G2--" + self.storage.toyou.pool;
                                params.description = self.storage.toyou.description;
                                params.storagePool = self.storage.toyou.pool;
                                var ipAddr = self.storage.toyou.ip_0 + "." + self.storage.toyou.ip_1 + "." + self.storage.toyou.ip_2 + "." + self.storage.toyou.ip_3;
                                var option = {
                                    storage_name: "toyou_" + time,
                                    storage_type: "toyou",
                                    san_ip: ipAddr,
                                    san_login: self.storage.toyou.userName,
                                    san_password: self.storage.toyou.password,
                                    storwize_svc_volpool_name: self.storage.toyou.pool,
                                    volume_driver: "cinder.volume.drivers.toyou.storwize_svc.storwize_svc_fc.StorwizeSVCFCDriver",
                                    volume_backend_name: "NCS7500G2--" + self.storage.toyou.pool
                                }
                                params.diskPath = ipAddr;
                                params.storageConfiguration = angular.toJson(option);
                                self.storage_type = "toyou";
                            }
                            if(check){
                                self.ruijieDataParams = params;
                                return;
                            }
                            storageManagementSrv.createStorageData(params).then(function(result) {
                                if(result && result.status == "0") {
                                    if(self.storage.manufacturer.id == "toyou"&&self.storage_type == "toyou") {
                                        storageManagementSrv.initVolumeType();    //同有初始化卷类型
                                    }
                                }else {
                                    hideLoading();
                                    if(result && result.code == "01080305") {
                                        alertSrv.set("", $translate.instant("aws.system.storagement.storageTranslate.clusterLimitOperation"), "error", 5000);
                                    }
                                }
                            });
                            $uibModalInstance.close();
                            var tip = $translate.instant("aws.system.storagement.addstorageMessage");
                            showLoading(tip, "add");
                        }
                    })
                } else if(self.storage.use.id == "1"){// 云主机备份
                    if(self.storage.backup.device.id == "NFS" && !self.storage.backup.nfsPath) {
                        self.checkNfsTip = $translate.instant("aws.system.storagement.storageTranslate.nfsTips");
                        self.checkNfsTipShow = true;
                        self.nfsAddrCount = 1;
                        return;
                    }
                    if(self.storage.backup.device.id == "ceph" && (self.privilegeFileCheck || self.configFileCheck)) {
                        return;
                    }
                    var form = document.forms.namedItem("createStorageForm");
                    var oData = new FormData(form);
                    oData.append("enterpriseUid", params.enterpriseUid);
                    oData.append("regionUid", params.regionUid);
                    oData.append("regionKey", params.regionKey);
                    oData.append("storageUse", params.storageUse);
                    oData.append("storageDevice", self.storage.backup.device.id);
                    oData.append("description", self.storage.backup.backupDes);
                    oData.append("percent", 0.9);
                    var option = "";
                    if(self.storage.backup.device.id == "NFS") { // 备份-NFS
                        var nfsAddr = self.storage.backup.ip_0 + "." + self.storage.backup.ip_1 + "." + self.storage.backup.ip_2 + "." + self.storage.backup.ip_3;
                        oData.append("storageFirm", "NFS");
                        oData.append("diskPath", nfsAddr + ":" + self.storage.backup.nfsPath.id);
                        option = {
                            backup_type: "nfs",
                            backup_share: nfsAddr + ":" + self.storage.backup.nfsPath.id
                        }
                    }else if(self.storage.backup.device.id == "ceph") { // 备份-ceph
                        option = {
                            backup_type: "ceph",
                            backup_ceph_user: self.storage.backup.backupUser,
                            backup_ceph_pool: self.storage.backup.backupPool
                        }
                    }
                    var storageConfiguration = angular.toJson(option);
                    oData.append("storageConfiguration", storageConfiguration);
                    var oReq = new XMLHttpRequest();
                    var successTips = $translate.instant("aws.system.storagement.addBackupSuccess");
                    var errorTips = $translate.instant("aws.system.storagement.addBackupFailed");
                    oReq.onerror = function(e) {
                        hideLoading();
                        if(e.type == "error") {
                            alertSrv.set("", errorTips, "error", 5000);
                        }
                    };
                    oReq.onload = function(e) {
                        var responseObj = JSON.parse(oReq.responseText);
                        if(responseObj) {
                            if(responseObj.code == 0) {
                                
                            }else {
                                hideLoading();
                                if(responseObj.code == "01080305") {
                                    alertSrv.set("", $translate.instant("aws.system.storagement.storageTranslate.clusterLimitOperation"), "error", 5000);
                                }
                            }
                        }
                    }
                    oReq.open("POST", window.GLOBALCONFIG.APIHOST.BASE + "/v1/storage/backup", true);
                    let auth_token = localStorage.$AUTH_TOKEN;
                    oReq.setRequestHeader("X-Auth-Token",auth_token);
                    oReq.send(oData);
                    var tip = $translate.instant("aws.system.storagement.addstorageMessage");
                    showLoading(tip, "add");
                    $uibModalInstance.close();
                }
            } else {
                self.submitValid = true;
            }
        }
    }else if(type == "edit"){
        self.modalTitle = $translate.instant("aws.system.storagement.editTitle");
        self.stoNameList = storageNameList.filter(item => !(item == editData.name));
        self.storage = {
            name: editData.name || "",
            description: editData.description || ""
        }

        self.editConfirm = function(updateStorageForm) {
            if(updateStorageForm.$valid && !self.nameCheck) {
                var loginData = angular.fromJson(localStorage.$LOGINDATA);
                var regionUid = loginData.regionUid;
                var option  =  {
                    id: editData.id,
                    name: self.storage.name,
                    description: self.storage.description,
                    enterpriseUid: localStorage.enterpriseUid,
                    regionUid: regionUid,
                    regionKey: localStorage.regionKey
                }
                storageManagementSrv.editStorageData(option).then(function(result) {
                    $uibModalInstance.close();
                    initStorageTable();
                });
            } else {
                self.submitValid = true;
            } 
        }
    }


    function changeUse(obj) {
        if(obj.id == "1") {  //后端
            self.backupShow = true;
            checkName();
        } else {  //备份
            self.backupShow = false;
            checkName();
        }
        self.changeNfsAddr();
        self.selected_file = "";
        self.selected_privilegeFile = "";
    }

    function changeDevice(obj) {
        if(obj.id == "NFS") {  //NFS
            self.backupNfsShow = true;
            if(self.nfsAddrCheckSuccess) {
                self.nfsAddrCheck = false;
            } else {
                self.nfsAddrCheck = true;
            }
        } else {  //ceph
            self.backupNfsShow = false;
        }
    }

    function changeType(obj) {
        if(obj.id == "0") {  //预定义
            self.preTypeShow = true;
        } else {  // 自定义
            self.preTypeShow = false;
        }
    }

    // 添加存储时校验存储名称是否已存在
    function checkName() {
        var item = self.storage.name;
        if(self.storage.use && self.storage.use.id == "0" || editData && editData.use == "0") {
            if(self.stoNameList.indexOf(item) > -1) {
                self.nameCheck = true;
            }else {
                self.nameCheck = false;
            }
        }else {
            self.nameCheck = false;
        }
    }

    function getPoolList() {
        storageManagementSrv.getStoragePoolList().then(function(result) {
            if(result && angular.isArray(result.data) && result.data.length > 0) {
                result.data.forEach(function(item) {
                    if(item.storageName == "toyou") {
                        self.poolList = item.storageDir;
                    }else if(item.storageName == "ruijie") {
                        self.ruijiePoolList = item.storageDir;
                    }
                });
            }
        });
    }

    /*节点网卡配置*/

    self.twoModule = {
        storageRange: { start: "10.0.2.1", end: "10.0.2.254", startname: "storageStart", endname: "storageEnd" },
        storage: "",
        storageVlan:"1000",
        storageCheck: false,
        storageRangeCheck:false,
        storageCidr: "10.0.2.0/24",
        storageNetmask: ""
    }
    var storageIpRange = [];
    self.tenantIpRange  = [];
    self.canModifyStoNet = true;
    var tenantRangeData = {
        startVlan : "",
        endVlan : ""
    }
    storageManagementSrv.getStorageIp(localStorage.regionKey).then(function(res){
        if(res&&res.data){
            storageIpRange = res.data.filter(item=>{
                return item.name == 'storage';
            })
            self.tenantIpRange = res.data.filter(item=>{
                return item.name == 'tenant';
            })
            tenantRangeData.startVlan = Number(self.tenantIpRange[0].vlan.split('-')[0]);
            tenantRangeData.endVlan = Number(self.tenantIpRange[0].vlan.split('-')[1]);
            self.twoModule.storageRange.start = storageIpRange[0].iprange[0].start;
            self.twoModule.storageRange.end = storageIpRange[0].iprange[0].end;
            self.twoModule.storageCidr = storageIpRange[0].cidr;
        }
    })
    /*下发网络配置修改存储网络*/
    self.nodeconfigure =function(m){
        if (m.$valid) {
            var startip  = _IP.cidrSubnet(self.twoModule.storageCidr).firstAddress;
            var endip  = _IP.cidrSubnet(self.twoModule.storageCidr).lastAddress;
            var data = {
                "storage":{
                    "vlan": self.twoModule.storageCheck?self.twoModule.storageVlan:"",
                    "cidr": self.twoModule.storageCidr,
                    "range":[
                        {
                            "start":self.twoModule.storageRangeCheck?self.twoModule.storageRange.start:startip,
                            "end":self.twoModule.storageRangeCheck?self.twoModule.storageRange.end:endip
                        }
                    ]
                }
            }

            if(data.storage.vlan!=''){
                var storageVlan = Number(data.storage.vlan);
                if(storageVlan>=tenantRangeData.startVlan&&storageVlan<=tenantRangeData.endVlan){
                    self.storageVlanCheck = true;
                    $timeout(function(){
                        self.storageVlanCheck = false;
                    },2000)
                    return
                }

            }
            storageManagementSrv.configStorageData(data).then(function(result) {
                if(result && result.status == "0") {
                    $uibModal.open({
                        animation: true,
                        templateUrl: "netConfigure.html",
                        controller: "netConfigureController"
                    });
                }else {
                    if(result && result.code == "01080305") {
                        alertSrv.set("", $translate.instant("aws.system.storagement.storageTranslate.clusterLimitOperation"), "error", 5000);
                    }
                }
            });
        }
    }

    /*获取存储列表, 检查storage_protocol字段, 如果有ceph, iSCSI, lvm, nfs其中之一，就判定为不能修改存储网*/
    storageManagementSrv.getStorage().then(function(result) {
        if(result && result.data && result.data.length) {
            for(var i = 0; i < result.data.length; i++) {
                var protocol = result.data[i].capabilities.storage_protocol;
                if(protocol == "ceph" || protocol == "iSCSI" || protocol == "lvm" || protocol == "nfs") {
                    self.canModifyStoNet = false;
                    break;
                }
            }
        }
    });

    self.$on("netConfigureSuccess", function(e, data) {
        var loginData = angular.fromJson(localStorage.$LOGINDATA);
        getNode(loginData.regionUid);
    });

    // self.$on("netConfigureFailed", function(e, data) {
    //     self.showIscsiLoading = false;
    //     alertSrv.set("", "下发网络配置失败", "error", 5000);
    // });

    self.resetIpConf = function(ipForm) {
        self.twoModule.storageCheck = false;
        self.twoModule.storageRangeCheck = false;
        storageManagementSrv.getStorageIp(localStorage.regionKey).then(function(res){
            if(res&&res.data){
                storageIpRange = res.data.filter(item=>{
                    return item.name == 'storage';
                })
                self.tenantIpRange = res.data.filter(item=>{
                    return item.name == 'tenant';
                })
                tenantRangeData.startVlan = Number(self.tenantIpRange[0].vlan.split('-')[0]);
                tenantRangeData.endVlan = Number(self.tenantIpRange[0].vlan.split('-')[1]);
                self.twoModule.storageCidr = storageIpRange[0].cidr;
                self.twoModule.storageVlan = "1000";
                self.twoModule.storageRange.start = storageIpRange[0].iprange[0].start;
                self.twoModule.storageRange.end = storageIpRange[0].iprange[0].end;
            }
        });
    }

    self.stateMachine ={
        cardDisable:true,
        configDisable:true,
        netTestDisable:true,
        disksDisable:true,
        fcDisksDisable:true
    }

    function canMultipleDiskConfig(checkedItems){
        var checkDiskData = [],isDiskChecked=false;
        for(var i=0;i<checkedItems.length;i++){
            var disksItems = [];
            for(var j=0;j<checkedItems[i].hostInfoMap.disks.length;j++){
                var diska = {
                    "capacity":checkedItems[i].hostInfoMap.disks[j].capacity,
                    "name":checkedItems[i].hostInfoMap.disks[j].name,
                    "ssd":checkedItems[i].hostInfoMap.disks[j].ssd,
                    "status":checkedItems[i].hostInfoMap.disks[j].status
                }
                disksItems.push(diska)
            }
            var diskItems = {
                "disks":disksItems
            }
            checkDiskData.push(diskItems)
        }
        for(var i=0;i<checkDiskData.length-1;i++){
            var firstDisk = JSON.stringify(checkDiskData[i].disks.sort(by('name')));
            var elseDisk = JSON.stringify(checkDiskData[i+1].disks.sort(by('name')));
            if(firstDisk!=elseDisk){
                isDiskChecked =true;
                break;
            }
        } 
        return isDiskChecked;
    }

    /*使用by排序兼容edge浏览器*/
    function by(name){
        return function(o, p){
           var a, b;
           if (typeof o === "object" && typeof p === "object" && o && p) {
             a = o[name];
             b = p[name];
             if (a === b) {
               return 0;
             }
             if (typeof a === typeof b) {
               return a < b ? -1 : 1;
             }
             return typeof a < typeof b ? -1 : 1;
           }
           else {
             throw ("error");
           }
        }
    }

    self.$watch(function(){
        return self.checkedItems
    },function(val){
        if(!val){
            return
        }
        if(val.length==1){
            self.stateMachine ={
                cardDisable:false,
                configDisable:false,
                netTestDisable:false,
                disksDisable:false,
                fcDisksDisable:false
            }
        }else if(val.length>1){
            self.stateMachine ={
                cardDisable:true,
                configDisable:true,
                netTestDisable:true,
                fcDisksDisable:true
                //disksDisable:true
            }
            self.stateMachine.disksDisable=canMultipleDiskConfig(val);
        }else{
            self.stateMachine ={
                cardDisable:true,
                configDisable:true,
                netTestDisable:true,
                disksDisable:true,
                fcDisksDisable:true
            }
        }
        if(self.stepOneData){
            if(val && val.length==self.stepOneData.length){
                self.stateMachine.netTestDisable = false;
            }else{
                self.stateMachine.netTestDisable = true;
            }    
        }
    })
    
    function changeUnit(v){
        if(v.search(/TB$/i)>-1){
            return Number(v.replace(/TB$/i,""))*1024;
        }else if(v.search(/PB$/i)>-1){
            return Number(v.replace(/PB$/i,""))*1024*1024;
        }else if(v.search(/GB$/i)>-1){
            return Number(v.replace(/GB$/,""));
        }else if(v.search(/MB$/i)>-1){
            return parseInt(Number(v.replace(/MB$/i,""))/1024);
        }else if(v.search(/KB$/i)>-1){
            return parseInt(Number(v.replace(/KB$/i,""))/1024/1024);
        }
        return 0;
    }

    function setUnit(v){
        if(parseInt(v/(1024*1024)) > 0){
            return {total:(v/(1024*1024)).toFixed(2),unit:"PB"};
        }else if(parseInt(v/1024) > 0){
            return {total:(v/1024).toFixed(2),unit:"TB"};
        }
        return {total:v.toFixed(2),unit:"GB"};
    }

    function sortNumber(a,b){
        return _IP.toLong(a.hostInfoMap.ip) - _IP.toLong(b.hostInfoMap.ip);
    }

    var diskData = []
    function initDiskTable(diskData){
        self.fcDiskData = diskData;
        self.tableDiskNodes = new NgTableParams({ count: 5 }, { counts: [], dataset:  diskData});
        newCheckedSrv.checkDo(self, diskData, "nodeUid","tableDiskNodes");
    }

    function getNode(regionUid) {
        self.stepOneData = [];
        var stepOneTemp = [];
        storageManagementSrv.getAllNode(regionUid).then(function(res) {
            if (res && res.data) {
                res.data = res.data.filter(item=>{return item.status==4;})
                stepOneTemp = res.data;
                stepOneTemp = stepOneTemp.sort(sortNumber);
                storageManagementSrv.getAvailableDisks(localStorage.regionKey).then(function(result){
                    if(result&&result.data){
                        replaceAvailable(result.data,regionUid)
                    }
                })
                function replaceAvailable(availableDisk,regionUid){
                    var nodeNamesArry =[];
                    angular.forEach(stepOneTemp, function(v, index) {
                        nodeNamesArry.push(v.hostName)
                    });
                    var nodeName = { nodeNames: nodeNamesArry }
                    storageManagementSrv.isHealthAction(nodeName, regionUid).then(function(result) {
                        if(result&&result.data){
                            stepOneTemp = stepOneTemp.filter(healthItem=>{
                                return result.data[healthItem.hostName] ==true;
                            })
                            angular.forEach(stepOneTemp, function(v, index) {
                                v.hostInfoMap = JSON.parse(v.hostInfo)
                                v.hostInfoMap.ssdAll = new Number();
                                v.hostInfoMap.sataAll = new Number();
                                var availableDiskItem = availableDisk.filter(h=>{
                                    return h.nodeName == v.hostName
                                })
                                v.hostInfoMap.disks = availableDiskItem[0].diskAttributesList;
                                let data = v.hostInfoMap.disks;
                                var ssdAll=0;
                                var sataAll=0;
                                for (let i = 0; i < data.length; i++) {
                                    if (data[i].ssd) {
                                        ssdAll += changeUnit(data[i].capacity);
                                    } else {
                                        sataAll += changeUnit(data[i].capacity);
                                    }
                                }
                                if(ssdAll>0){
                                    v.hostInfoMap.ssdAll = setUnit(ssdAll).total;
                                    v.hostInfoMap.ssdUnit = setUnit(ssdAll).unit;
                                }
                                if(sataAll>0){
                                    v.hostInfoMap.sataAll = setUnit(sataAll).total;
                                    v.hostInfoMap.sataUnit = setUnit(sataAll).unit;
                                }
                            });
                            self.stepOneData = stepOneTemp;
                            self.stepOneData = self.stepOneData.sort(sortNumber); 
                            if(nodeMapList&&Object.keys(nodeMapList).length>0){
                                self.stepOneData.forEach(item=>{
                                    if(nodeMapList[item.nodeUid]){
                                        item.disk_config = nodeMapList[item.nodeUid].disk_config;
                                        item.disk_speed = nodeMapList[item.nodeUid].disk_speed;
                                        item.disk_ssd_ceph = nodeMapList[item.nodeUid].disk_ssd_ceph;
                                    }
                                })
                            }  
                            self.manageStorageNodes = new NgTableParams({ count: 4 }, { counts: [], dataset: self.stepOneData });
                            var tableId = "nodeUid";
                            newCheckedSrv.checkDo(self,self.stepOneData,tableId,'manageStorageNodes');

                            diskData = angular.copy(self.stepOneData);
                            initDiskTable(diskData);
                        }
                    })
                }
            }
        });
    }
    var loginData = angular.fromJson(localStorage.$LOGINDATA);
    getNode(loginData.regionUid);

    self.getback = function(){
        self.showType ='stor'
    }
    self.getback();

    self.cardconfigure = function(checkedItems){
        self.showType ='sto';
        if(checkedItems.length>0){
            getCard(checkedItems[0])
        }
        
    }
    self.disksconfigure = function(checkedItems,type){
        var parameter = {
            checkedItems:checkedItems,
            type:type,
            diskData:diskData,
            initDiskTable:initDiskTable
        }
        
        storageDiskCtrl($scope,$timeout, $location,NgTableParams,parameter,storageManagementSrv,$translate,nodeMapList,self.stepOneData)
        
        // if(type=='fc'){
        //     var diskParams = {
        //         nodeName:checkedItems[0].hostName
        //         // isMultipath:self.storage.fc.multipath?1:0
        //     }
        //     if(!localStorage.nodeConfig){
        //         localStorage.nodeConfig = JSON.stringify({});
        //     }
        // }else if(type=='ceph'){
        //     if(!localStorage.cephDiskConfig){
        //         localStorage.cephDiskConfig = JSON.stringify({});
        //     }
        // }
        // self.showType ='disk';
        // $timeout(function(){
        //     initDiskConfig(diskParams,checkedItems,type)
        // },200)
    }


    // function initDiskConfig(diskParams,checkedItems,type){ 
    //     self.nodeName=checkedItems[0].hostName;
    //     localStorage.diskCheckedItems = JSON.stringify(checkedItems);
    //     self.diskscachType = [
    //         {name:"缓存盘",mode:"bcache"},
    //         {name:"日志盘",mode:"raw_multi_journal"}
    //         //{name:"",mode:"journal_collocation"}
    //     ]
    //     var diskCheckedItems =null;
    //     var disks = $("#disks")[0];
    //     if(localStorage.diskCheckedItems&&type=='ceph'){
    //         diskCheckedItems = JSON.parse(localStorage.diskCheckedItems)[0];
    //         var cephDiskConfig = JSON.parse(localStorage.cephDiskConfig);
    //         if(cephDiskConfig[diskCheckedItems.nodeUid]&&cephDiskConfig[diskCheckedItems.nodeUid].disksJson){
    //             self.disksJson = cephDiskConfig[diskCheckedItems.nodeUid].disksJson;
    //         }else{
    //             self.disksJson = {
    //                 "disks":diskCheckedItems.hostInfoMap.disks,
    //                 "configGroup":[
    //                     {   
    //                         "show":true,
    //                         "cachingSum":0,
    //                         "dataSum":0,
    //                         "cachingRatio":0,
    //                         "dataRatio":0,
    //                         "selected":self.diskscachType[0],
    //                         "caching":[  
    //                         ],
    //                         "data":[  
    //                         ]
    //                     }
    //                 ]
    //             }
    //         }
    //     }else{
    //         diskCheckedItems = JSON.parse(localStorage.diskCheckedItems)[0];
    //         var nodeConfig = JSON.parse(localStorage.nodeConfig);
    //         if(nodeConfig[diskCheckedItems.nodeUid]&&nodeConfig[diskCheckedItems.nodeUid].disksJson){
    //             self.disksJson = nodeConfig[diskCheckedItems.nodeUid].disksJson;
    //         }else{
    //             self.disksJson = {
    //                 "disks":[],
    //                 //"disks":diskCheckedItems.hostInfoMap.disks,
    //                 "configGroup":[
    //                     {   
    //                         "show":true,
    //                         "cachingSum":0,
    //                         "dataSum":0,
    //                         "cachingRatio":0,
    //                         "dataRatio":0,
    //                         "selected":self.diskscachType[0],
    //                         "caching":[  
    //                         ],
    //                         "data":[  
    //                         ]
    //                     }
    //                 ]
    //             }
    //             storageManagementSrv.getNodeDisk(diskParams).then(function(res){
    //                 if(res && res.data) {
    //                     self.disksJson.disks = angular.fromJson(res.data);
    //                 }
    //             })
    //         }
    //     }

    //     /*数据初始化*/
    //     function sumDisk(item,type){
    //         var sum = 0;
    //         item[type].forEach(function(v){
    //             if(self.insideCephShow){
    //                 if(v.capacity.indexOf('TB')>-1){
    //                     var vCapacity = v.capacity;
    //                     vCapacity=vCapacity.replace("TB",'');
    //                     sum+=vCapacity*1024;
    //                 }else{
    //                     var vCapacity = v.capacity;
    //                     vCapacity=vCapacity.replace("GB",'');
    //                     sum+=Number(vCapacity);
    //                 }  
    //             }else{
    //                 if(v.size.indexOf('T')>-1){
    //                     var vCapacity = v.size;
    //                     vCapacity=vCapacity.replace("T",'');
    //                     sum+=vCapacity*1024;
    //                 }else{
    //                     var vCapacity = v.size;
    //                     vCapacity=vCapacity.replace("G",'');
    //                     sum+=Number(vCapacity);
    //                 }  
    //             }
                
    //         })
    //         if(type=='caching'){
    //             item.cachingSum = sum;
    //         }else{
    //             item.dataSum = sum;
    //         }
    //     } 
    //     function sumRatio(item){
    //         item.cachingRatio = (item.cachingSum/(item.cachingSum+item.dataSum)).toFixed(1);
    //         item.dataRatio = 100 +'%';
    //         item.cachingRatio = item.cachingRatio*100 +'%';
    //         item.dataSum=item.dataSum.toFixed(2);
    //         item.cachingSum=Number(item.cachingSum).toFixed(2);
    //     }
    //     function Superposition(i,name){
    //         /*缓存盘或者日志盘只能配一块盘*/
    //         if(self.insideCephShow){
    //            if(name=='caching'&&self.disksJson.configGroup[i][name].length>0){
    //                 return;
    //            }
    //         }else{
    //            if(name=='data'&&self.disksJson.configGroup[i][name].length>0){
    //                 return;
    //            }
    //         }
    //         self.disksJson.configGroup[i][name].push(self.disksJson.disks[disksIndex]);
    //         self.disksJson.disks.splice(disksIndex,1);
    //         sumDisk(item,'caching')
    //         sumDisk(item,'data')
    //         sumRatio(item)
    //         self.$apply()
    //     }
    //     var cachingIndex = null;
    //     var dataIndex = null;
    //     for(var i=0;i<self.disksJson.configGroup.length;i++){
    //         var item = self.disksJson.configGroup[i];
    //         sumDisk(item,'caching')
    //         sumDisk(item,'data')
    //         sumRatio(item)
    //     }
    //     $timeout(function(){
    //         for(var i=0;i<self.disksJson.configGroup.length;i++){
    //             if(self.insideCephShow){
    //                $(".caching")[i].addEventListener('drop',function(event){
    //                    event.preventDefault();
    //                    cachingIndex= $(this).attr('indexNum');
    //                    Superposition(cachingIndex,'caching');
    //                })
    //             }
    //             $(".data")[i].addEventListener('drop',function(event){
    //                 event.preventDefault();
    //                 dataIndex= $(this).attr('indexNum');
    //                 Superposition(dataIndex,'data');
    //             })
    //         }
    //     },300)
    //     /*删除磁盘*/
    //     self.deleteDisks = function(index,type,item){
    //         /*1.删除元素并添加到可用区域*/
    //         self.disksJson.disks.push(item[type][index])
    //         item[type].splice(index,1);
    //         /*2.所占比例更新*/
    //         sumDisk(item,'caching')
    //         sumDisk(item,'data')
    //         sumRatio(item)
    //     }

    //     /*记住拖动哪个磁盘*/
    //     var disksIndex = null;
    //     $(".no-use-disks")[0].addEventListener('dragstart',function(event){
    //         disksIndex = $(event.target).attr('indexNum');
    //         event.dataTransfer.setData("text/html",$(this).prop("outerHTML"));
    //     },false)
     
    //     disks.addEventListener('dragenter',function(event){
    //     },false)
    //     disks.addEventListener('dragover',function(event){
    //         event.preventDefault();
    //     },false)

    //     /*保存磁盘配置*/
    //     self.saveDisks = function(){
    //         var dataCheck = true;
    //         /*遍历所有的数据盘不能为空*/
    //         for(var i=0;i<self.disksJson.configGroup.length;i++){
    //             if(self.disksJson.configGroup[i].data.length==0){
    //                 dataCheck = false;
    //             }
    //         }
    //         if(dataCheck){
    //             var diskCheckedItems = JSON.parse(localStorage.diskCheckedItems)
    //             if(self.insideCephShow){
    //                 diskCheckedItems.forEach(function(item){
    //                     var nodeId = item.nodeUid;
    //                     var cephDiskConfig = JSON.parse(localStorage.cephDiskConfig);
    //                     cephDiskConfig[nodeId] = {}
    //                     cephDiskConfig[nodeId].disksJson = self.disksJson;
    //                     localStorage.cephDiskConfig = JSON.stringify(cephDiskConfig);
    //                 })
    //                 self.stepOneData.forEach(item=>{
    //                     diskCheckedItems.forEach(function(checkItem){
    //                          if(item.nodeUid == checkItem.nodeUid){
    //                             var diskNameArr=[];
    //                             self.disksJson.configGroup[0].data.forEach(function(item){
    //                                 diskNameArr.push("/dev/"+item.name);
    //                             });
    //                             item.disk_config=diskNameArr.join(", ");
    //                             item.disk_speed = self.disksJson.configGroup[0].data[0].capacity;
    //                             //新增日志盘
    //                             item.disk_ssd_ceph=self.disksJson.configGroup[0].caching.length>0?("/dev/"+self.disksJson.configGroup[0].caching[0].name):"";
    //                             nodeMapList[item.nodeUid] = {
    //                                 disk_config:item.disk_config,
    //                                 disk_speed:item.disk_speed,
    //                                 disk_ssd_ceph:item.disk_ssd_ceph
    //                             }
    //                         }
    //                     });
    //                 })

    //                 self.getback();
    //             }else{
    //                 diskCheckedItems.forEach(function(item){
    //                     var nodeId = item.nodeUid;
    //                     var nodeConfig = JSON.parse(localStorage.nodeConfig);
    //                     nodeConfig[nodeId] = {}
    //                     nodeConfig[nodeId].disksJson = self.disksJson;
    //                     localStorage.nodeConfig = JSON.stringify(nodeConfig);
    //                 })
    //                 diskData.forEach(item=>{
    //                     if(item.nodeUid == diskCheckedItems[0].nodeUid){
    //                         item.disk_config = self.disksJson.configGroup[0].data[0].path;
    //                         item.disk_speed = self.disksJson.configGroup[0].data[0].size;
    //                         item.uid = self.disksJson.configGroup[0].data[0].uid;
    //                     }
    //                 })
    //                 initDiskTable(diskData);
    //                 self.backStoNode();
    //             }
    //         }else{
    //             self.dataTips = true;
    //             $timeout(function(){
    //                 self.dataTips = false;
    //             },2000)
    //         }
    //     }
    // }

    function initNetCheckTable(data){
        var result_action = data;
        var tableData = [];
        if(JSON.stringify(result_action)!={}){
            for(var i in result_action){
                var checkNode = {
                    nodeName:i,
                    result:result_action[i]
                }
                tableData.push(checkNode)
            }
        }
        self.netchecktableParams = new NgTableParams({ count: 5 }, { counts: [], dataset: tableData });
    } 

    self.checkNet = function(checkedItems){
        self.showType ='net';
        var storage_type = '';
        switch(self.storage.manufacturer.id)
        {
            case "outsideCeph":
                storage_type="out_ceph";
            break;
            case "insideCeph":
                storage_type="ceph";
            break;
            case "nfs":
                storage_type="nfs";
            break;
            case "iscsi":
                storage_type="iscsi";
            break;
            case "ruijie":
                storage_type="ruijie";
            break;
        }
        var params = {
            'storageType':storage_type,
            'storageName':self.storage.name
        }
        storageManagementSrv.checkResultData(params).then(function(result) {
            if(result&&result.data){
                self.checkFail = false;
                if(result.data.indexOf('output')>-1){
                    var checkResult = JSON.parse(result.data).output;
                    if((checkResult.storage_name == self.storage.name)&&(storage_type== checkResult.storage_type)){
                        var data=checkResult.action_result;
                    }else if(result.data.indexOf('network.check.storage.fail')>-1){
                        self.checkFail = true;
                        var datas = {}; 
                    }else{
                        var data = {};
                    }
                }else{
                    var data = {};
                }
                console.log(data)
                initNetCheckTable(data)
            }
        });
    }

    self.startCheck = function(){
        var storageIps =[];
        self.checkFail = false;

        self.stepOneData.forEach(function(item){
            var network = JSON.parse(item.nodeConfigScript).network;
            var storageip = network.filter(i=>{
                return i.role == 'storage'
            })
            var nodeItem ={}
            var key = item.hostName;
            nodeItem[key] = storageip[0].ip;
            storageIps.push(nodeItem)
        })

        var dataParams={ 
            "region_code":localStorage.regionKey,
            "storage_name":self.storage.name,
            "action_type":"check_network_storage",
            "storage_server_ips":[],
            "node_storage_ips":storageIps
        }

        self.netTestCan = {
            testBtn:true,
            testLoad:true
        }
        
        if(self.storage.manufacturer.id=='outsideCeph'){
            var form = document.forms.namedItem("createStorageForm");
            var oData = new FormData(form);
            var oReq = new XMLHttpRequest();
            oReq.onerror = function(e) { 
                if(e.type == "error") {
                    alertSrv.set("",$translate.instant("aws.system.storagement.storageTranslate.uploadConfigFail"), "error", 5000);
                }
            };
            oReq.onload = function(e) {
                var responseObj = JSON.parse(oReq.responseText);
                if(responseObj) {
                    if(responseObj.code == 0) {
                        dataParams.storage_type="out_ceph";
                        dataParams.storageConfiguration={
                            "storage_id":responseObj.data.data,
                            "storage_type":"out_ceph"
                        }
                        storageManagementSrv.checkStorageData(dataParams).then(function(result) {
                        })
                    }else {
                        alertSrv.set("",$translate.instant("aws.system.storagement.storageTranslate.uploadConfigFail"), "error", 5000);
                    }
                }
            }
            oReq.open("POST", window.GLOBALCONFIG.APIHOST.BASE + "/v1/storage/file/upload/outceph", true);
            let auth_token = localStorage.$AUTH_TOKEN;
            oReq.setRequestHeader("X-Auth-Token",auth_token);
            oReq.send(oData); 
        }else{
            var rujieCheckNet = true;
            switch(self.storage.manufacturer.id)
            {
                case "insideCeph":
                    dataParams.storage_type = "ceph";
                break;
                
                case "nfs":
                    dataParams.storage_type = "nfs";
                    //dataParams.storage_server_ips.push(self.storage.nfs.nfsAddr)
                    var nfsAddr = self.storage.nfs.ip_0+'.'+self.storage.nfs.ip_1+'.'+self.storage.nfs.ip_2+'.'+self.storage.nfs.ip_3;
                    dataParams.storage_server_ips.push(nfsAddr)
                break;
                case "iscsi":
                    dataParams.storage_type = "iscsi";
                    dataParams.storage_server_ips.push(self.storage.iscsi.serverIp)
                break;
                case "ruijie":
                    self.storageConfirm(true);
                    rujieCheckNet = false;
                    dataParams.storage_type = "ruijie";
                    self.$watch(function(){
                        return self.ruijieDataParams
                    },function(v){
                        if(v){
                            var params = JSON.parse(v.storageConfiguration);
                            if(params.storage_type =='ruijie_toyou'){
                                params.storage_type = 'toyou'
                            }   
                            dataParams.storageConfiguration = params;
                            storageManagementSrv.checkStorageData(dataParams).then(function(result) {
                            })
                        }
                    })
                break;
            }
            if(rujieCheckNet){
                storageManagementSrv.checkStorageData(dataParams).then(function(result) {
                })
            }  
        }
    }
    self.$on("netCheckSocket", function(e,data){
        self.netTestCan = {
            testBtn:false,
            testLoad:false
        }
        if(data.indexOf('output')>-1){
            self.checkFail = false;
            var datas = JSON.parse(data).output.action_result
        }else if(data.indexOf('network.check.storage.fail')>-1){
            self.checkFail = true;
            var datas = {}  
        }else{
            self.checkFail = false;
            var datas = {} 
        }
        self.$apply();
        initNetCheckTable(datas)
    });

    function getCard(node){
        var nodeConfigScript = JSON.parse(node.nodeConfigScript);
        function getSpeed(name){
            var nics = node.hostInfoMap.nics;
            var bonds = nodeConfigScript.bonds;
            var nicsItem = nics.filter(item=>{
                return item.name == name;
            })
            if(nicsItem.length>0){
                return nicsItem[0].speed;
            }else{
                var bondsName = bonds[name].nics[0];
                nicsItem = nics.filter(item=>{
                    return item.name == bondsName;
                })
                return nicsItem[0].speed;
            }
        }
        self.cardJson={
            "nic_map": {
                "cluster": {bonds:nodeConfigScript.nic_map.cluster,speed:getSpeed(nodeConfigScript.nic_map.cluster)},
                "storage": {bonds:nodeConfigScript.nic_map.storage,speed:getSpeed(nodeConfigScript.nic_map.storage)},
                "public": {bonds:nodeConfigScript.nic_map.public,speed:getSpeed(nodeConfigScript.nic_map.public)},
                "tenant": {bonds:nodeConfigScript.nic_map.tenant,speed:getSpeed(nodeConfigScript.nic_map.tenant)},
                "mgmt": {bonds:nodeConfigScript.nic_map.mgmt,speed:getSpeed(nodeConfigScript.nic_map.mgmt)}
            }
        } 

    }
    

}]).directive("storageincidr", [function() {
        return {
            require: "ngModel",
            link: function(scope, elem, attrs, $ngModel) {
                var cidr = "#" + attrs.storageincidr;
                $ngModel.$parsers.push(function(value){
                    var min = _IP.cidrSubnet($(cidr).val()).networkAddress;
                    var max = _IP.cidrSubnet($(cidr).val()).broadcastAddress;
                    if(_IP.isV4Format(value)){
                        if(!_IP.cidrSubnet($(cidr).val()).contains(value) || (_IP.cidrSubnet($(cidr).val()).contains(value) && (_IP.toLong(min) >= _IP.toLong(value) || _IP.toLong(max)<= _IP.toLong(value)))){
                            $ngModel.$setValidity("storageincidr", false);
                            return value;
                        }
                    }
                    $ngModel.$setValidity("storageincidr", true);
                    return value;
                });
                $ngModel.$formatters.push(function(value){
                    var min = _IP.cidrSubnet($(cidr).val()).networkAddress;
                    var max = _IP.cidrSubnet($(cidr).val()).broadcastAddress;
                    if(_IP.isV4Format(value)){
                        if(!_IP.cidrSubnet($(cidr).val()).contains(value) || (_IP.cidrSubnet($(cidr).val()).contains(value) && (_IP.toLong(min) >= _IP.toLong(value) || _IP.toLong(max)<= _IP.toLong(value)))){
                            $ngModel.$setValidity("storageincidr", false);
                            return value;
                        }
                    }
                    $ngModel.$setValidity("storageincidr", true);
                    return value;
                });
                scope.$watch(function(){
                    return $(cidr).val();
                },function(val){
                    if(_IP.cidrSubnet(val)){
                        var min = _IP.cidrSubnet(val).networkAddress;
                        var max = _IP.cidrSubnet(val).broadcastAddress;
                        if(!_IP.cidrSubnet(val).contains($ngModel.$viewValue) || (_IP.cidrSubnet(val).contains($ngModel.$viewValue) && (_IP.toLong(min) >= _IP.toLong($ngModel.$viewValue) || _IP.toLong(max)<= _IP.toLong($ngModel.$viewValue)))){
                            $ngModel.$setValidity("storageincidr", false);
                            return;
                        }
                        $ngModel.$setValidity("storageincidr", true);
                    }
                });
            }
        };
    }]).directive("vlanlimitstart", function() {
        return {
            restrict:"A",
            require:"ngModel",
            link: function(scope, elem, attrs, $ngModel) {
                var reg = /^[1-9]\d*$/;
                $ngModel.$parsers.push(function(viewValue){
                    var num = Number(viewValue);
                    if(reg.test(num)){
                        if(num>=2&&num<=4094){
                            $ngModel.$setValidity("vlanlimitstart", true);
                            scope.valnstartFlag=true;
                        }else{
                            $ngModel.$setValidity("vlanlimitstart", false);
                            scope.valnstartFlag=false;
                        }
                    }else{
                        $ngModel.$setValidity("vlanlimitstart", false);
                        scope.valnstartFlag=false;
                    }
                    return viewValue;
                })
            }
        };
    });
