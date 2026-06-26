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