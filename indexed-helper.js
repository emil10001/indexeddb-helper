function IDB(){
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

/**
*
* options = {
*  dbName : 'your database name',
*  version : 'your database schema version',
*  storeName : 'your store name',
*  keyPath : 'inline key',
*  indexes : [{ name : 'indexName', unique : 'true/false' },{},...]
* }
*
*/
IDB.init = function(options,success,failure){
    var request;
    if (!!options.version)
        request = indexedDB.open(options.dbName,options.version);
    else
        request = indexedDB.open(options.dbName);
    request.onerror = function(event){
        console.log('failed to open db ' + event);
        failure();
    };
    request.onupgradeneeded = function(event){
        console.log('onupgrade ', options);
        var db = event.target.result;
        console.log('upgrade ',event);
        var objectStore;
        if(!db.objectStoreNames.contains(options.storeName)){
            if (!!options.keyPath)
                objectStore = db.createObjectStore(options.storeName, {keyPath: options.keyPath});
            else
                objectStore = db.createObjectStore(options.storeName);
        } else {
            objectStore = event.currentTarget.transaction.objectStore(options.storeName);
        }
        if (!!options.indexes){
            for (var i=0;i<options.indexes.length;i++){
                var indexName = options.indexes[i].name;
                var indexData = options.indexes[i];

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
        success(db);
    };
    request.onsuccess = function(event){
        var db = event.target.result;
        success(db);
    };
}

IDB.getItem = function(options, key, success, failure){
    var onsuccess = function(db){
        var request = db.transaction(options.storeName).objectStore(options.storeName).get(key);
        request.onsuccess = function(event){
            console.log('getItem',event);
            success(event.target.result);
        }
        request.onerror = failure;
    }
    var onerror = failure; 
    IDB.init(options,onsuccess,onerror);
}

IDB.getAll = function(options, success, failure){
    var onsuccess = function(db){
        var objectStore = db.transaction(options.storeName)
        .objectStore(options.storeName);
        var results = [];

        objectStore.openCursor().onsuccess = function(event) {
            var cursor = event.target.result;
            if (cursor) {
                results.push(cursor.value);
                cursor.continue();
            }
            else {
                success(results);
            }
        };
        objectStore.onerror = failure;
    }
    var onerror = failure; 
    IDB.init(options,onsuccess,onerror);
}

IDB.remove = function(options, key, success, failure){
    var onsuccess = function(db){
        console.log('delete: ', key);
        var request = db.transaction(options.storeName, "readwrite")
        .objectStore(options.storeName).delete(key);
        request.onsuccess = function(event) {
            success();
        };
        request.onerror = failure;
    }
    var onerror = failure; 
    IDB.init(options,onsuccess,onerror);
}

IDB.put = function(options, data, success, failure){
    var onsuccess = function(db){
        console.log('options',options);
        var request = db.transaction(options.storeName,"readwrite")
        .objectStore(options.storeName)
        .put(data);
        request.onsuccess = function(event) {
            success();
        };
        request.onerror = failure;
    }
    var onerror = failure; 
    IDB.init(options,onsuccess,onerror);
}
