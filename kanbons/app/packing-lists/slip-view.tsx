import type { Address, PackingSlip } from "@/lib/models/packing_slip_match";

function fmtDate(value: string | null): string {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${Number(month)}/${Number(day)}/${year.slice(-2)}`;
}

function listNumber(slip: PackingSlip): string {
  const code = slip.customerCode?.trim();
  const po = slip.customerPo?.trim();
  if (code && po) return `${code}-${po}`;
  if (po) return po;
  return String(slip.numPl);
}

function invoiceNumber(slip: PackingSlip): string {
  const list = listNumber(slip);
  return list ? `INV-${list}` : "";
}

function addressLines(address: Address, company?: string | null): string[] {
  const lines = [address.name];
  const companyName = company?.trim();
  if (companyName && companyName !== address.name?.trim()) {
    lines.push(companyName);
  }
  lines.push(
    address.address,
    [address.city, address.state, address.zip].filter(Boolean).join(", ")
  );
  return lines.filter((line): line is string => Boolean(line && line.trim()));
}

const ITEM_SLOTS = 16;

export function SlipView({
  slip,
  copyLabel,
}: {
  slip: PackingSlip;
  copyLabel?: string;
}) {
  const list = listNumber(slip);
  const invoice = invoiceNumber(slip);

  return (
    <section className="slip-copy">
      {copyLabel ? <p className="slip-copy-label">{copyLabel}</p> : null}
      <header className="slip-letterhead">
        <div>
          <img
            src="/kanbons-logo.png"
            alt="Kanbons"
            className="slip-logo"
            width={72}
            height={72}
          />
          <p className="slip-company">KANBONS LLC</p>
          <p>2911 Turtle Creek Blvd, Ste 300</p>
          <p>Dallas, TX 75219</p>
        </div>
        <div className="slip-title-block">
          <h2 className="slip-title">Packing Slip</h2>
          <table className="slip-meta">
            <thead>
              <tr>
                <th>Date</th>
                <th>Packing List #</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{fmtDate(slip.date)}</td>
                <td>{list}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </header>

      <div className="slip-parties">
        <div className="slip-box">
          <p className="slip-box-label">Ship to:</p>
          {addressLines(slip.shipTo, slip.customerName).map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <div className="slip-box">
          <p className="slip-box-label">Bill to:</p>
          {addressLines(slip.billTo, slip.customerName).map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </div>

      <table className="slip-bar">
        <thead>
          <tr>
            <th>Purchase Order #</th>
            <th>Ship From</th>
            <th>Ship Date</th>
            <th>Invoice #</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{slip.customerPo}</td>
            <td>Florida</td>
            <td>{fmtDate(slip.shipDate)}</td>
            <td>{invoice}</td>
          </tr>
        </tbody>
      </table>

      <div className="slip-items-wrap">
        <p className="slip-watermark" aria-hidden="true">
          Page 1
        </p>
        <table className="slip-items">
          <thead>
            <tr>
              <th>Item #</th>
              <th>Item Code</th>
              <th>Description</th>
              <th>Pack/Roll</th>
              <th>Quantity</th>
            </tr>
          </thead>
          <tbody>
            {slip.lines.length === 0 ? (
              <tr>
                <td colSpan={5} className="slip-empty">
                  Lines appear as you type the purchase order.
                </td>
              </tr>
            ) : (
              Array.from({ length: Math.max(ITEM_SLOTS, slip.lines.length) }, (_, index) => {
                const line = slip.lines[index];
                if (!line) {
                  return (
                    <tr key={`empty-${index}`}>
                      <td>&nbsp;</td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                    </tr>
                  );
                }
                return (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{line.sku || ""}</td>
                    <td>
                      {line.asWritten || "—"}
                      {line.matched ? null : (
                        <span className="slip-nomatch">No name match</span>
                      )}
                    </td>
                    <td>{line.unit ?? ""}</td>
                    <td>{line.yardsPieces ?? ""}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <table className="slip-racks">
        <tbody>
          <tr>
            <th>Racks</th>
            <td>Small</td>
            <td></td>
          </tr>
          <tr>
            <th>Racks</th>
            <td>Medium</td>
            <td></td>
          </tr>
          <tr>
            <th>Racks</th>
            <td>Big</td>
            <td></td>
          </tr>
        </tbody>
      </table>

      <p className="slip-footer">
        Please contact Customer Service at INFO@KANBONS.COM with any questions or
        concerns.
        <br />
        Thank you for your business!
      </p>
    </section>
  );
}
