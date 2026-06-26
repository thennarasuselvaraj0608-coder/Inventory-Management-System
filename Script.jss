function addProduct(){

let name=document.getElementById("name").value;
let barcode=document.getElementById("barcode").value;
let quantity=document.getElementById("quantity").value;
let price=document.getElementById("price").value;

let alert = quantity < 5 ? "Low Stock" : "Available";

let row=`
<tr>
<td>${name}</td>
<td>${barcode}</td>
<td>${quantity}</td>
<td>${price}</td>
<td>${alert}</td>
</tr>
`;

document.getElementById("productTable").innerHTML += row;

document.getElementById("name").value="";
document.getElementById("barcode").value="";
document.getElementById("quantity").value="";
document.getElementById("price").value="";
}

// Load products when page opens
window.onload = loadProducts;

function loadProducts() {

    fetch("http://localhost:8080/products")
    .then(response => response.json())
    .then(data => {

        let table = document.getElementById("productTable");
        table.innerHTML = "";

        data.forEach(product => {

            let alert = product.quantity < 5 ? "Low Stock" : "Available";

            table.innerHTML += `
            <tr>
                <td>${product.productName}</td>
                <td>${product.barcode}</td>
                <td>${product.quantity}</td>
                <td>${product.price}</td>
                <td>${alert}</td>
            </tr>
            `;

        });

    });

}

function addProduct() {

    let product = {

        productName: document.getElementById("name").value,
        barcode: document.getElementById("barcode").value,
        quantity: parseInt(document.getElementById("quantity").value),
        price: parseFloat(document.getElementById("price").value)

    };

    fetch("http://localhost:8080/products", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify(product)

    })

    .then(response => response.json())
    .then(data => {

        alert("Product Added Successfully!");

        document.getElementById("name").value = "";
        document.getElementById("barcode").value = "";
        document.getElementById("quantity").value = "";
        document.getElementById("price").value = "";

        loadProducts();

    });

}