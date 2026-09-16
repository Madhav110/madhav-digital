migrate((app) => {

  // =========================
  // STAFF / LOGIN
  // =========================
  const staff = new Collection({
    type: "auth",
    name: "staff",

    passwordAuth: {
      enabled: true,
      identityFields: ["email"]
    },

    fields: [
      {
        type: "text",
        name: "name",
        max: 100
      }
    ]
  });

  app.save(staff);


  // =========================
  // PRODUCTS
  // =========================
  const products = new Collection({
    type: "base",
    name: "products",

    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",

    fields: [
      {
        type: "text",
        name: "product_name",
        required: true,
        max: 200
      },
      {
        type: "text",
        name: "product_code",
        required: true,
        max: 100
      },
      {
        type: "text",
        name: "supplier",
        max: 200
      },
      {
        type: "number",
        name: "purchase_price"
      },
      {
        type: "number",
        name: "selling_price"
      },
      {
        type: "number",
        name: "stock_qty",
        onlyInt: true
      },
      {
        type: "file",
        name: "photo",
        maxSelect: 1,
        maxSize: 5242880
      },
      {
        type: "text",
        name: "remarks",
        max: 1000
      }
    ]
  });

  app.save(products);


  // =========================
  // SALES / BILL
  // =========================
  const sales = new Collection({
    type: "base",
    name: "sales",

    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",

    fields: [
      {
        type: "text",
        name: "bill_no",
        required: true,
        max: 100
      },
      {
        type: "text",
        name: "customer_name",
        max: 200
      },
      {
        type: "text",
        name: "customer_mobile",
        max: 30
      },
      {
        type: "date",
        name: "bill_date"
      },
      {
        type: "number",
        name: "subtotal"
      },
      {
        type: "number",
        name: "discount"
      },
      {
        type: "number",
        name: "total"
      },
      {
        type: "number",
        name: "paid"
      },
      {
        type: "number",
        name: "due"
      },
      {
        type: "select",
        name: "payment_status",
        values: ["Paid", "Partial", "Due"],
        maxSelect: 1
      },
      {
        type: "text",
        name: "remarks",
        max: 1000
      },
      {
        type: "relation",
        name: "created_by",
        collectionId: staff.id,
        maxSelect: 1
      }
    ]
  });

  app.save(sales);


  // =========================
  // SALE ITEMS
  // =========================
  const saleItems = new Collection({
    type: "base",
    name: "sale_items",

    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",

    fields: [
      {
        type: "relation",
        name: "sale",
        collectionId: sales.id,
        maxSelect: 1,
        cascadeDelete: true
      },
      {
        type: "relation",
        name: "product",
        collectionId: products.id,
        maxSelect: 1
      },
      {
        type: "text",
        name: "product_name",
        max: 200
      },
      {
        type: "number",
        name: "quantity",
        required: true,
        onlyInt: true
      },
      {
        type: "number",
        name: "rate"
      },
      {
        type: "number",
        name: "line_total"
      }
    ]
  });

  app.save(saleItems);

}, (app) => {

  const saleItems = app.findCollectionByNameOrId("sale_items");
  app.delete(saleItems);

  const sales = app.findCollectionByNameOrId("sales");
  app.delete(sales);

  const products = app.findCollectionByNameOrId("products");
  app.delete(products);

  const staff = app.findCollectionByNameOrId("staff");
  app.delete(staff);
});
