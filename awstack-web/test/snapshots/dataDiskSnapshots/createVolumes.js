'use strict'
describe('测试', function() {
    it('数据盘快照创建云硬盘测试', () => {
        browser.get("http://localhost:22555/#/cvm/snapshots");
        element.all(by.css('.table .checkbox')).get(1).click();//选中列表中的第一条数据
        element.all(by.css('.btn.btn-info')).get(0).click();//点击创建云硬盘
		expect(element(by.css('.modal .modal-dialog .modal-header h3')).isPresent()).toBe(true);//判断新建弹出层的标题是否存在
    });

    it('数据盘快照创建云硬盘失败测试', () => {
        browser.get("http://localhost:22555/#/cvm/snapshots");
        element.all(by.css('.table .checkbox')).get(1).click();//选中列表中的第一条数据
        element.all(by.css('.btn.btn-info')).get(0).click();//点击创建云硬盘
        element.all(by.css('.form-controls')).get(0).sendKeys("错误名称==");//输出不合法的名称
        element.all(by.css('.form-controls')).get(1).sendKeys("错误描述");//输入描述
        element.all(by.css('.btn.btn-primary')).get(0).click();//点击弹出层的确定
		expect(element(by.css('.modal .modal-dialog .modal-header h3')).isPresent()).toBe(true);//判断新建弹出层的标题是否存在
    });
    
    it('数据盘快照创建云硬盘成功测试', () => {
        browser.get("http://localhost:22555/#/cvm/snapshots");
        element.all(by.css('.table .checkbox')).get(1).click();//选中列表中的第一条数据
        element.all(by.css('.btn.btn-info')).get(0).click();//点击创建云硬盘
        element.all(by.css('.form-controls')).get(0).sendKeys("正确名称");//输入合法的名称
        element.all(by.css('.form-controls')).get(1).sendKeys("正确描述");//输入描述
        element.all(by.css('.btn.btn-primary')).get(0).click()//点击弹出层的确定
        browser.sleep(3000);
		expect(element(by.css('.modal .modal-dialog .modal-header h3')).isPresent()).toBe(false);//判断新建弹出层的标题是否存在
    });

});