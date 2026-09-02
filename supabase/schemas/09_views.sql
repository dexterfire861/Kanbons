create view public.packing_list_line_totals as
select
  l.id,
  l.packing_list_id,
  l.product_id,
  l.product,
  l.yards_pieces,
  l.unit,
  l.type_of_unit,
  l.pre_uni,
  l.yards_pieces * l.pre_uni as total
from public.packing_list_lines l;

create view public.contador as
select
  p.id as product_id,
  p.num,
  p.product,
  p.unit_pack,
  p.pre_uni,
  coalesce(recv.have, 0) as have,
  coalesce(sold.sold, 0) as sold,
  coalesce(recv.have, 0) - coalesce(sold.sold, 0) as difference,
  s.quantity as book_quantity,
  case
    when s.quantity is not null and p.unit_pack is not null
      then s.quantity * p.unit_pack
  end as book_measurement,
  s.contador_physical as warehouse,
  s.contador_counted_at,
  case
    when s.quantity is not null
      and abs(
        coalesce(recv.have, 0) - coalesce(sold.sold, 0)
        - coalesce(s.quantity * p.unit_pack, s.quantity)
      ) > 0.01
      then true
    else false
  end as book_mismatch,
  case
    when s.contador_physical is not null
      and abs(
        coalesce(s.contador_physical, 0)
        - coalesce(s.quantity * p.unit_pack, s.quantity, 0)
      ) > 0.01
      then true
    else false
  end as warehouse_mismatch
from public.products p
left join public.stock s on s.product_id = p.id
left join (
  select sl.product_id, sum(sl.yards_pcs) as have
  from public.shipment_lines sl
  where sl.product_id is not null
  group by sl.product_id
) recv on recv.product_id = p.id
left join (
  select pll.product_id, sum(pll.yards_pieces) as sold
  from public.packing_list_lines pll
  where pll.product_id is not null
  group by pll.product_id
) sold on sold.product_id = p.id;
