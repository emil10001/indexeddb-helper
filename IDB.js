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

function IDB(dbName,version,options){
    this.dbName = dbName;
    this.version = version;
    this.db = null;
    this.objectStore = null;
    this.options = {};
    if (options instanceof Array){
        for (var i = 0;i<options.length; i++){
            this.options[options[i].storeName] = options[i];
        }
    } else {
        this.options[options.storeName] = options;
    }
    console.log('options',this.options);

    var request;
    if (!!this.version)
        request = indexedDB.open(this.dbName,this.version);
    else
        request = indexedDB.open(this.dbName);

    request.onerror = function(event){
        console.log('failed to open db ' + event);
        IDB.failure();
    };
    request.onupgradeneeded = function(event){
        var db = event.target.result;
        this.db = db;
        var opKeys = Object.keys(this.options);
        for (var i=0; i < opKeys.length; i++){
            var options = this.options[opKeys[i]];
            var objectStore;

            if(!this.db.objectStoreNames.contains(options.storeName)){
                if (!!options.keyPath)
                    objectStore = db.createObjectStore(options.storeName, {keyPath: options.keyPath});
                else
                    objectStore = db.createObjectStore(options.storeName);
            } else {
                objectStore = event.currentTarget.transaction.objectStore(options.storeName);
            }
            if (!!options.indexes){
                for (var j=0;j<options.indexes.length;j++){
                    var indexName = options.indexes[j].name;
                    var indexData = options.indexes[j];

                    if(objectStore.indexNames.contains(indexName)){
                        // check if it complies
                        var actualIndex = objectStore.index(indexName);
                        var complies = indexComplies(actualIndex, indexData);
                        if(!complies){
                            objectStore.deleteIndex(indexName);
                            objectStore.createIndex(indexName, indexName, { unique: indexData.unique });
                        }
                    } else {
                        objectStore.createIndex(indexName, indexName, { unique: indexData.unique });
                    }
                }
            }
        }
        //success(event.target.transaction);
        IDB.events.emit('dbopenupgrade', [this.dbName, event.target.transaction]);
    }.bind(this);
    request.onsuccess = function(event){
        this.db = event.target.result;
        //success();
        IDB.events.emit('dbopen', [this.dbName]);
    }.bind(this);
}

IDB.events = new EventEmitter();

IDB.failure = function(){
    IDB.events.emit('failure');
}

// https://github.com/jensarps/IDBWrapper/blob/master/idbstore.js
function indexComplies(actual, expected) {
    var complies = ['keyPath', 'unique', 'multiEntry'].every(function (key) {
        // IE10 returns undefined for no multiEntry
            if (key == 'multiEntry' && actual[key] === undefined && expected[key] === false) {
                return true;
            }
            return expected[key] == actual[key];
    });
    return complies;
};

IDB.prototype.getTransactionStore = function(storeName,mode){
    if (!(this.db instanceof IDBDatabase))
        throw 'missing database error!';

    if (typeof mode !== 'string')
        return this.db.transaction(storeName).objectStore(storeName);
    else
        return this.db.transaction(storeName,mode).objectStore(storeName);
}

IDB.prototype.getItemOnIndex = function(storeName, index, key){
    var boundKeyRange = IDBKeyRange.only(key);

    var cursorRequest = this.getTransactionStore(storeName)
    .index(index).openCursor(boundKeyRange);

    cursorRequest.onsuccess = function(event) {
        var cursor = cursorRequest.result || event.result;
        if (cursor) {
            IDB.events.emit('getitem',[this.dbName, storeName, cursor.value]);
        }
        else {
            console.log('no cursor');
            IDB.failure();
        }
    }.bind(this);
    cursorRequest.onerror = IDB.failure;
}

IDB.prototype.getItem = function(storeName, key){
    var getRequest = this.getTransactionStore(storeName).get(key);

    getRequest.onsuccess = function(event) {
        //success(event.target.result);
        IDB.events.emit('getitem',[this.dbName, storeName, event.target.result]);
    }.bind(this);
    getRequest.onerror = IDB.failure;
}

IDB.prototype.getInit = function(transaction, storeName){
    var objectStore = transaction.objectStore(storeName);
    var results = [];

    objectStore.openCursor().onsuccess = function(event) {
        var cursor = event.target.result;
        if (cursor) {
            results.push(cursor.value);
            cursor.continue();
        }
        else {
            //success(results);
            IDB.events.emit('getinit',[this.dbName, storeName, results]);
        }
    }.bind(this);
    objectStore.onerror = IDB.failure;
}

IDB.prototype.getAll = function(storeName){
    var objectStore = this.getTransactionStore(storeName);
    var results = [];

    objectStore.openCursor().onsuccess = function(event) {
        var cursor = event.target.result;
        if (cursor) {
            results.push(cursor.value);
            cursor.continue();
        }
        else {
            //success(results);
            IDB.events.emit('getall',[this.dbName, storeName, results]);
        }
    }.bind(this);
    objectStore.onerror = IDB.failure;
}

IDB.prototype.remove = function(storeName, key){
    var request = this.getTransactionStore(storeName, "readwrite").delete(key);
    request.onsuccess = function(event){
        IDB.events.emit('remove',[this.dbName,storeName]);
    }.bind(this);
    request.onerror = IDB.failure;
}

IDB.prototype.put = function(storeName, data){
    var request = this.getTransactionStore(storeName, "readwrite").put(data);
    request.onsuccess = function(event){
        IDB.events.emit('put',[this.dbName,storeName]);
    }.bind(this);
    request.onerror = IDB.failure;
}

// data should be an array of objects to be inserted
IDB.batchInsert = function(storeName, data) {
    var objectStore = this.getTransactionStore(storeName,"readwrite");

    var i=0;
    function putNext() {
        if (i<data.length) {
            var request = objectStore.put(data[i]);
            request.onsuccess = putNext;
            request.onerror = IDB.failure;
            ++i;
        } else {
            console.log('populate complete');
            IDB.events.emit('batchinsert',[this.dbName,storeName]);
        }
    }

    putNext();
}

define (function(){
    return IDB;
});

