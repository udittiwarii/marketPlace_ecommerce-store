function calculatePricing(items) {
    let subtotal = 0;

    items.forEach(item => {
        subtotal += item.total;

    });

    const tax = subtotal * 0.18;
    const shipping = 100;
    const total = subtotal + tax + shipping;

    return { subtotal, tax, shipping, total };
}


module.exports = { calculatePricing };