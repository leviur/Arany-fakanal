fetch("../components/cart.html")
  .then(res => res.text())
  .then(data => {
    document.getElementById("cart").innerHTML = data;

    // előbb töltse be a html, utána az inicialást
    initCart();
  });

function initCart() {
  const cartDrawer = document.getElementById("cartDrawer");
  const cartOverlay = document.getElementById("cartOverlay");
  const closeCart = document.getElementById("closeCart");

  window.openCart = () => {
    cartDrawer.classList.add("active");
    cartOverlay.classList.add("active");
  };

  function closeCartFn() {
    cartDrawer.classList.remove("active");
    cartOverlay.classList.remove("active");
  }

  closeCart?.addEventListener("click", closeCartFn);
  cartOverlay?.addEventListener("click", closeCartFn);
}