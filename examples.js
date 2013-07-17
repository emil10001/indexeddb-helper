'use strict';

/**
 *
 * options = {
 *  storeName : 'your store name',
 *  keyPath : 'inline key',
 *  indexes : [{ name : 'indexName', unique : 'true/false' },{},...]
 * }
 *
 * ------ OR -------
 *
 * options = [{
 *  storeName : 'your store name',
 *  keyPath : 'inline key',
 *  indexes : [{ name : 'indexName', unique : 'true/false' },{},...]
 * }, {
 *  storeName : 'your second store name',
 *  keyPath : 'inline key',
 *  indexes : [{ name : 'indexName', unique : 'true/false' },{},...] 
 * }] 
 * 
 */

var options = {
    storeName : 'todos',
    keyPath : 'timeStamp',
    indexes : [{name : 'text', unique : false}]
};

var success = function(){console.log('success');};
var failure = function(){console.log('failure');};


var getItemsSuccess = function(data){
    console.log('getItemsSuccess',data);
};

var errorCallback = function(){
    console.log('error'); 
};

var successCallback = function(){
    console.log('success'); 
};

var getInit = function(transaction){
    console.log('getInit',transaction);
    if (transaction instanceof IDBTransaction)
        idb.getInit(transaction, options.storeName, getItemsSuccess,errorCallback);
    else
        idb.getAll(options.storeName, getItemsSuccess,errorCallback);
};

var getItems = function(){
    idb.getAll(options.storeName, getItemsSuccess,errorCallback);
    console.log('getItems'); 
};

var printItem = function(data){
    console.log('printItem ', data);
};

var getItem = function(key){
    console.log('getItem ',key);
    idb.getItem(options.storeName, parseInt(key), printItem,errorCallback);
    idb.getItemOnIndex(options.storeName, options.indexes[0].name, key, printItem,errorCallback);
}

var deleteItem = function(item){
    idb.remove(options.storeName, item.timeStamp, getItems,errorCallback);
}

var addItem = function(item){
    idb.put(options.storeName, {'timeStamp': new Date().getTime(), 'text' : item},getItems,errorCallback); 
};

var idb = new IDB('idb-todos',1,options,getInit,failure);
