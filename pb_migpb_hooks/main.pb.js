routerAdd("POST", "/api/madhav/create-sale", (e) => {

  if (!e.auth) {
    throw new UnauthorizedError("Login required");
  }

  const data = {};
  e.bindBody(data);

  const customerName = String(data.customer_name || "");
  const customerMobile = String(data.customer_mobile || "");
  const billDate = String(data.bill_date || "");
  const discount = Number(data.discount || 0);
  const paid = Number(data.paid || 0);
  const remarks = String(data.remarks || "");
  const items = Array.isArray(data.items) ? data.items : [];

  if (!billDate || items.length === 0) {
    throw new BadRequestError("Bill date and at least one item are required");
  }

  if (discount < 0 || paid < 0) {
    throw new BadRequestError("Invalid discount or paid amount");
  }

  let result = null;

  $app.runInTransaction((txApp) => {

    const products = [];
    let subtotal = 0;

    for (const item of items) {

      const productId = String(item.product_id || "");
      const qty = Number(item.quantity || 0);
      const rate = Number(item.rate || 0);

      if (!productId || !Number.isInteger(qty) || qty <= 0 || rate < 0) {
        throw new BadRequestError("Invalid bill item");
      }

      const product = txApp.findRecordById("products", productId);

      const stock = Number(product.get("stock_qty") || 0);

      if (qty > stock) {
        throw new BadRequestError(
          "Insufficient stock for " +
          product.getString("product_name")
        );
      }

      products.push({
        product: product,
        qty: qty,
        rate: rate
      });

      subtotal += qty * rate;
    }

    const total = Math.max(0, subtotal - discount);

    if (paid > total) {
      throw new BadRequestError(
        "Paid amount cannot exceed total"
      );
    }

    const due = Math.max(0, total - paid);

    const status =
      due <= 0
        ? "Paid"
        : (paid > 0 ? "Partial" : "Due");

    const billNo =
      "MD-" + Date.now().toString().slice(-8);

    const salesCol =
      txApp.findCollectionByNameOrId("sales");

    const sale = new Record(salesCol);

    sale.set("bill_no", billNo);
    sale.set("customer_name", customerName);
    sale.set("customer_mobile", customerMobile);
    sale.set("bill_date", billDate);
    sale.set("subtotal", subtotal);
    sale.set("discount", discount);
    sale.set("total", total);
    sale.set("paid", paid);
    sale.set("due", due);
    sale.set("payment_status", status);
    sale.set("remarks", remarks);
    sale.set("created_by", e.auth.id);

    txApp.save(sale);

    const itemsCol =
      txApp.findCollectionByNameOrId("sale_items");

    for (const x of products) {

      const itemRec = new Record(itemsCol);

      itemRec.set("sale", sale.id);
      itemRec.set("product", x.product.id);
      itemRec.set(
        "product_name",
        x.product.getString("product_name")
      );
      itemRec.set("quantity", x.qty);
      itemRec.set("rate", x.rate);
      itemRec.set(
        "line_total",
        x.qty * x.rate
      );

      txApp.save(itemRec);

      x.product.set(
        "stock_qty",
        Number(x.product.get("stock_qty") || 0) - x.qty
      );

      txApp.save(x.product);
    }

    result = {
      bill_no: billNo,
      sale_id: sale.id,
      subtotal: subtotal,
      discount: discount,
      total: total,
      paid: paid,
      due: due,
      payment_status: status
    };

  });

  return e.json(200, result);

}, $apis.requireAuth());
