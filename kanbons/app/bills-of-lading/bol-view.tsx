import type {
  BillOfLadingForm,
  BolAddress,
  BolCommodityRow,
  BolOrderRow,
} from "@/lib/models/bills_of_lading";

const ORDER_SLOTS = 5;
const COMMODITY_SLOTS = 6;

const SHIP_FROM: BolAddress = {
  name: "Kanbons LLC",
  address: "2911 Turtle Creek Blvd, Ste 300",
  cityStateZip: "Dallas, TX 75219",
};

function fmtDate(value: string | null): string {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${Number(month)}/${Number(day)}/${year}`;
}

function AddressBlock({
  title,
  address,
}: {
  title: string;
  address: BolAddress;
}) {
  return (
    <div className="bol-party">
      <p className="bol-label">{title}</p>
      <p>Name: {address.name ?? ""}</p>
      <p>Address: {address.address ?? ""}</p>
      <p>City/State/Zip: {address.cityStateZip ?? ""}</p>
    </div>
  );
}

function OrderTable({ rows }: { rows: BolOrderRow[] }) {
  return (
    <table className="bol-table">
      <thead>
        <tr>
          <th>Customer order number</th>
          <th># PKGS</th>
          <th>Weight</th>
          <th>Pallet/Slip</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${row.number}-${index}`}>
            <td>{row.number}</td>
            <td>{row.pkgs ?? ""}</td>
            <td></td>
            <td></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CommodityTable({
  rows,
  showDescription,
}: {
  rows: BolCommodityRow[];
  showDescription: boolean;
}) {
  return (
    <table className="bol-table">
      <thead>
        <tr>
          <th>Package qty</th>
          {showDescription ? <th>Commodity description</th> : null}
          <th>Weight</th>
          <th>HM</th>
          <th>NMFC #</th>
          <th>Class</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${row.description}-${index}`}>
            <td>{row.qty ?? ""}</td>
            {showDescription ? <td>{row.description}</td> : null}
            <td></td>
            <td></td>
            <td></td>
            <td></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function padOrders(rows: BolOrderRow[], slots: number): BolOrderRow[] {
  const next = rows.slice(0, slots);
  while (next.length < slots) next.push({ number: "", pkgs: null });
  return next;
}

function padCommodities(rows: BolCommodityRow[], slots: number): BolCommodityRow[] {
  const next = rows.slice(0, slots);
  while (next.length < slots) next.push({ description: "", qty: null });
  return next;
}

export function BolView({ form }: { form: BillOfLadingForm }) {
  const extraOrders = form.orders.slice(ORDER_SLOTS);
  const extraCommodities = form.commodities.slice(COMMODITY_SLOTS);
  const page2 = extraOrders.length > 0 || extraCommodities.length > 0;

  return (
    <div className="bol-sheet">
      <section className="bol-page">
        <header className="bol-head">
          <p>Date: {fmtDate(form.date)}</p>
          <h2>Bill of lading</h2>
          <p>Page 1{page2 ? " of 2" : ""}</p>
        </header>
        <div className="bol-parties">
          <AddressBlock title="Ship from" address={SHIP_FROM} />
          <AddressBlock title="Ship to" address={form.shipTo} />
          <AddressBlock title="Freight charges bill to" address={form.billTo} />
        </div>
        <h3>Customer order information</h3>
        <OrderTable rows={padOrders(form.orders, ORDER_SLOTS)} />
        <h3>Carrier information</h3>
        <CommodityTable
          rows={padCommodities(form.commodities, COMMODITY_SLOTS)}
          showDescription
        />
        <p className="bol-sign">
          Shipper signature / date ____________ Trailer loaded ____________ Freight
          counted ____________
        </p>
        <p className="bol-sign">
          Carrier signature / pickup date ____________ Bill of lading number{" "}
          {form.number}
        </p>
      </section>
      {page2 ? (
        <section className="bol-page">
          <header className="bol-head">
            <h2>Supplement to the bill of lading</h2>
            <p>Bill of lading number: {form.number}</p>
            <p>Page 2</p>
          </header>
          <h3>Customer order information</h3>
          <OrderTable rows={extraOrders} />
          <h3>Carrier information</h3>
          <CommodityTable rows={extraCommodities} showDescription />
        </section>
      ) : null}
    </div>
  );
}
