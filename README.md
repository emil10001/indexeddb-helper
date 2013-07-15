## About

This is a wrapper library for IndexedDB. It's very basic, definitely not production ready. This is really intended to be a learning exercise to learn the basics of IndexedDB. Also, IndexedDB seems to be a fairly verbose API, so I wanted to have a wrapper that would abstract out some of the redundant parts for me.


## Example Usage
    
    // example options
    
    var options = {
        dbName : 'idb-todos',
        version : 4,
        storeName : 'todos',
        keyPath : 'timeStamp',
        indexes : [{name : 'text', unique : false}]
    };
    
    // entry looks like:
    // { timeStamp : 1373869051860, text : 'test' }
    // keyPath is timeStamp
    // index on text
    // timeStamp is an int (doesn't need to be, but it is)
    
    // callbacks
    
    var getItemsSuccess = function(data){
        console.log('success',data);
    };
    
    var errorCallback = function(){
        console.log('error'); 
    };
    
    var successCallback = function(){
        console.log('success'); 
    };
    
    var printItem = function(data){
        console.log('printItem ', data);
    };
    
    // db requests
    
    var getItems = function(){
        IDB.getAll(options, getItemsSuccess,errorCallback);
    };
    
    var getItem = function(key){
        console.log('getItem ',key);
        // this actually tries to get items on either the keyPath or an index, only one should
        // work, the other will fail. parseInt is used in the first call because timeStamp is a
        // number, instead of a string
        IDB.getItem(options, parseInt(key), printItem,errorCallback);
        IDB.getItemOnIndex(options, options.indexes[0].name, key, printItem,errorCallback);
    }
    
    var deleteItem = function(item){
        IDB.remove(options, item.timeStamp, getItems,errorCallback);
    }
    
    var addItem = function(){
        IDB.put(options, {'timeStamp': new Date().getTime(), 'text' : $scope.itemname},getItems,errorCallback); 
        $scope.itemname = ''; 
    };
    
    getItems();
