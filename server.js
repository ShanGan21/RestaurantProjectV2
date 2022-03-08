// Require the built-in modules
const http = require('http');
const fs = require('fs');
const path = require('path');
const pug = require("pug");

// Joining the path of directory
const files = fs.readdirSync(__dirname + '/restaurants/');

// Pug Functions to render various pages
const renderHome = pug.compileFile('./views/pages/index.pug');
const renderOrderForm = pug.compileFile('./views/pages/orderform.pug');
const renderRestaurantStatistics = pug.compileFile('./views/pages/restaurantstatistics.pug');

// Let allOrders is an object that holds all of the order form's totals
let allOrders = {};

// Sends a 404 response
function send404(response){
	response.statusCode = 404;
	response.write("Unknown resource.");
	response.end();
}

// Sends a 500 response
function send500(response){
	response.statusCode = 500;
	response.write("Server error.");
	response.end();
}

// Reads all of the restaurants from the JSON files
function readRestaurants() {
    // An array that holds the JSON files as objects
    const allRestaurantsArr = [];

    // Goes through each file
    files.forEach(function(file) {
        // Parses the contents and pushes to the allRestaurantsArr, which it returns  
        let contents = JSON.parse(fs.readFileSync(__dirname + '/restaurants/' + file, 'utf8'));
        allRestaurantsArr.push(contents);
    })

    return allRestaurantsArr;
}



function addOrder(orderObj) {   
    // Let orderObj represent the order passed in by the server
    // If the orderObj's name (restaurant name) is already a key, then ... 
    if (orderObj.name in allOrders) {

        // We go through every order and add based on the number ("0" for Orc Eyes) and quantity
        // Otherwise, if it not previously existing, then we still add it in
        for (let productName in orderObj.orders) {
            if (productName in allOrders[orderObj.name]["Orders"]) {
                allOrders[orderObj.name]["Orders"][productName] +=  orderObj.orders[productName];
            }  else {
                // console.log(orderObj.orders[productName]);
                allOrders[orderObj.name]["Orders"][productName] =  orderObj.orders[productName];
            }
            
        }

        // Increases number of orders for a restaurant by 1
        allOrders[orderObj.name]["Number of Orders"] += 1;

        // Calculates the average order for a restaurant
        allOrders[orderObj.name]["Total Price"] += orderObj.totalPrice;
        let newAvgOrder = allOrders[orderObj.name]["Total Price"] / allOrders[orderObj.name]["Number of Orders"]
        allOrders[orderObj.name]["Average Order"] = newAvgOrder

        // Determines the most popular item at the restaurant by the max quantity
        let maxProduct = "";
        for (let item in allOrders[orderObj.name]["Orders"]) {
            if (allOrders[orderObj.name]["Orders"][item] > maxProduct) {
                maxProduct = item;
            }
        }
        allOrders[orderObj.name]["Popular Item"] = maxProduct;

    } else {
        // If it is the first item, then we add objects that hold the order, number of orders, and all of the statistics
        allOrders[orderObj.name] = {};
        allOrders[orderObj.name]["Orders"] = {};
        allOrders[orderObj.name]["Number of Orders"] = 1;
        allOrders[orderObj.name]["Average Order"] = orderObj.totalPrice;
        allOrders[orderObj.name]["Popular Item"] = "N/A";
        allOrders[orderObj.name]["Total Price"] = orderObj.totalPrice;
        
        // Adds the orders to the allOrders object
        for (let productName in orderObj.orders) {
            allOrders[orderObj.name]["Orders"][productName] =  orderObj.orders[productName];
        }

        // Determines the most popular product
        let maxProduct = "";
        for (let item in allOrders[orderObj.name]["Orders"]) {
            if (allOrders[orderObj.name]["Orders"][item] > maxProduct) {
                maxProduct = item;
            }
        }
        allOrders[orderObj.name]["Popular Item"] = maxProduct;
    }
    
    // console.log(allOrders);
    // console.log(getName("Aragorn's Orc BBQ", "10"));
    
}

/* Since the orders are stored for each restaraunt by their number ("0"), the getName is used to find
the corresponding name of product (e.g. Orc Eyes). It takes two parameters, the first is restaurantName,
which is for example, Aragorn BBQ, and the numberStr, which is ("0") for a product. */
function getName(restaurantName, numberStr) {
    let restaurantObjects = readRestaurants();
    /* Obtains the restaurants from the JSON file, and if the name matches, then searches for the product name
    */
    for (let i = 0; i < restaurantObjects.length; i++) {
        // Finds the restaurant object based on restaurant name
        if (restaurantName == restaurantObjects[i].name) {

            // MenuCategory = Category
            for (menuCategory in restaurantObjects[i].menu) {
                for (productNum in restaurantObjects[i].menu[menuCategory]) {
                    if (productNum == parseInt(numberStr)) {
                        return restaurantObjects[i].menu[menuCategory][productNum].name;
                    }
                }
            }
            
        }
    }

}

// This function prints the allOrders object
function printAllOrdersObj() {
    console.log(allOrders);
}


// This function is used to obtain a list of all the restaurant names (for the menu categories)
function getRestaurantNames() {
    const allRestaurantNames = [];

    // Goes through every file in the JSON and adds to the allRestaurantNames
    // Returns an array of the restaurant names
    files.forEach(function(file) {
        let contents = fs.readFileSync(__dirname + '/restaurants/' + file, 'utf8');
        let resObj = (JSON.parse(contents));
        // console.log(JSON.parse(contents));
        allRestaurantNames.push(resObj.name);
    })

    return allRestaurantNames;
}

// Create a server, giving it the handler function
// Request represents the incoming request object
// Response represents the outgoing response object
const server = http.createServer(function (request, response) {
    // If the request method is GET, then ....
    if(request.method === "GET"){

        /* If it is requesting index, orderform, or restaurantstatistics pages, 
        then it gets the pages */

		if(request.url === "/" || request.url === "/index"){
			let content = renderHome();
			response.statusCode = 200;
			response.setHeader("Content-Type", "text/html");
			response.end(content);
        } else if (request.url === "/orderform") {
            let content = renderOrderForm();
            response.statusCode = 200;
            response.setHeader("Content-Type", "text/html");
            response.end(content);
        } else if (request.url === "/restaurantstatistics") {
            let content;

            // Gets all of the statistics and stores in an array
            if (allOrders != {}) {
                let allOrdersArray = [];

                // Goes through the allOrders object
                for (key in allOrders) {
                
                // Formatting information for popular item, average order, total price
                let popItem = getName(key, allOrders[key]["Popular Item"])
                let roundedAvg = allOrders[key]["Average Order"].toFixed(2);
                let roundedTotalPrice = allOrders[key]["Total Price"].toFixed(2);
                allOrdersArray.push([key, allOrders[key]["Number of Orders"], roundedAvg, popItem, roundedTotalPrice])
                }

                // Passes the allOrdersArray to the server
                content = renderRestaurantStatistics({orders: allOrdersArray});
            } else {
                // Otherwise, does not pass anything
                content = renderRestaurantStatistics();
            }
            
            // Sends the following response details
            response.statusCode = 200;
            response.setHeader("Content-Type", "text/html");
            response.end(content);

        } else if (request.url === "/client.js") {
            // If the request is a client.js, then it reads the file, sends a response if error, otherwise, sends 200
            fs.readFile("./client.js", function(err, data){
				if(err){
					send500(response);
					return;
				}
				response.statusCode = 200;
				response.setHeader("Content-Type", "application/javascript");
				response.end(data);
            });

            /* If the page is requesting the add or remove buttons for order forms */
        } else if (request.url === "/add.jpg") {
            fs.readFile('add.jpg', function(err, data) {
                if (err) {
                    send500(response);
                    return;
                }
                response.statusCode = 200;
                response.setHeader("Content-Type", "image/jpeg");
                response.end(data);
            });
        } else if (request.url === "/remove.jpg") {
            fs.readFile('remove.jpg', function(err, data) {
                if (err) {
                    send500(response);
                    return;
                }
                response.statusCode = 200;
                response.setHeader("Content-Type", "image/jpeg");
                response.end(data);
            });
            /* If the request is the server then it sends the restaurant names, otherwise
            if it is requesting allRestaurants object, then it sends that*/
        } else if (request.url === "/server.js") {
            let restaurantNames = JSON.stringify(getRestaurantNames());
            response.statusCode = 200;
            response.end(restaurantNames);
            console.log("Sending a reponse from server.js");

        } else if (request.url === "/server.js/allRestaurants") {
            let restObj = JSON.stringify(readRestaurants());
            response.statusCode = 200;
            response.end(restObj);
        } else {
		    send404(response);
        }

        // If the request method is POST
    } else if (request.method === "POST") {
        if (request.url === "/server.js/orderplaced") {
            // Let body represent the content and reads the data until it ends
            let body = "";
            request.on('data', (chunk) => {
                // console.log(chunk);
                body += chunk; // convert Buffer to string
            });

            request.on('end', () => {
                // Parses the object (order from client) and calls the addOrder function
                console.log("Sending a reponse from server.js/orderplaced");
                sentContent = JSON.parse(body);


                addOrder(sentContent);
                response.end();
    });
        
        }
    }

});

//Server listens on port 3000
server.listen(3000);
console.log('Server running at http://127.0.0.1:3000/');


