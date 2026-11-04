-- JinMemo initial application schema. Never import JinGo test data.
CREATE TABLE IF NOT EXISTS jinmemo_contact_requests(id text PRIMARY KEY, data jsonb NOT NULL, status text NOT NULL DEFAULT 'NEW', created_at timestamptz NOT NULL DEFAULT now());
      CREATE INDEX IF NOT EXISTS jinmemo_contact_requests_status ON jinmemo_contact_requests(status,created_at);
      CREATE TABLE IF NOT EXISTS jinmemo_weather_cache(id text PRIMARY KEY,data jsonb,fetched_at bigint NOT NULL DEFAULT 0,next_attempt bigint NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS jinmemo_weather_usage(month text PRIMARY KEY,calls integer NOT NULL DEFAULT 0,blocked boolean NOT NULL DEFAULT false);
      CREATE TABLE IF NOT EXISTS jinmemo_settings(id text PRIMARY KEY,data jsonb NOT NULL,version integer NOT NULL DEFAULT 1);
      CREATE TABLE IF NOT EXISTS jinmemo_migrations (id text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS jinmemo_vouchers(id text PRIMARY KEY,code text NOT NULL UNIQUE,data jsonb NOT NULL,version integer NOT NULL DEFAULT 1);
      CREATE TABLE IF NOT EXISTS jinmemo_suppliers(id text PRIMARY KEY,data jsonb NOT NULL,version integer NOT NULL DEFAULT 1);
      CREATE TABLE IF NOT EXISTS jinmemo_destinations(id text PRIMARY KEY,slug text NOT NULL UNIQUE,data jsonb NOT NULL,version integer NOT NULL DEFAULT 1);
      CREATE TABLE IF NOT EXISTS jinmemo_products (id text PRIMARY KEY, slug text NOT NULL UNIQUE, data jsonb NOT NULL, version integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS jinmemo_admins (id text PRIMARY KEY, email text NOT NULL UNIQUE, password_hash text NOT NULL);
      CREATE TABLE IF NOT EXISTS jinmemo_sessions (token_hash text PRIMARY KEY, admin_id text NOT NULL REFERENCES jinmemo_admins(id), expires_at timestamptz NOT NULL);
      CREATE INDEX IF NOT EXISTS jinmemo_sessions_expiry ON jinmemo_sessions(expires_at);
      CREATE TABLE IF NOT EXISTS jinmemo_admin_geo_cache(id text PRIMARY KEY,data jsonb NOT NULL,expires_at timestamptz NOT NULL);
      CREATE TABLE IF NOT EXISTS jinmemo_admin_geo_usage(id text PRIMARY KEY,calls integer NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS jinmemo_admin_security(id text PRIMARY KEY,data jsonb NOT NULL,version integer NOT NULL DEFAULT 1);
      CREATE TABLE IF NOT EXISTS jinmemo_admin_otp(id text PRIMARY KEY,admin_id text NOT NULL REFERENCES jinmemo_admins(id),purpose text NOT NULL,code_hash text NOT NULL,binding_hash text NOT NULL,data jsonb NOT NULL,status text NOT NULL DEFAULT 'PENDING',attempts integer NOT NULL DEFAULT 0,expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
      CREATE INDEX IF NOT EXISTS jinmemo_admin_otp_expiry ON jinmemo_admin_otp(expires_at);
      CREATE INDEX IF NOT EXISTS jinmemo_admin_otp_admin ON jinmemo_admin_otp(admin_id,purpose,created_at);
      CREATE TABLE IF NOT EXISTS jinmemo_admin_login_limits(id text PRIMARY KEY,attempts integer NOT NULL DEFAULT 0,until_at timestamptz NOT NULL);
      CREATE TABLE IF NOT EXISTS jinmemo_admin_login_log(id text PRIMARY KEY,admin_id text,email text NOT NULL,event text NOT NULL,data jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
      CREATE INDEX IF NOT EXISTS jinmemo_admin_login_log_date ON jinmemo_admin_login_log(created_at);
      CREATE TABLE IF NOT EXISTS jinmemo_pos_users(id text PRIMARY KEY,email text NOT NULL UNIQUE,password_hash text NOT NULL,data jsonb NOT NULL,version integer NOT NULL DEFAULT 1);
      CREATE TABLE IF NOT EXISTS jinmemo_pos_sessions(token_hash text PRIMARY KEY,user_id text NOT NULL,role text NOT NULL,expires_at timestamptz NOT NULL);
      CREATE INDEX IF NOT EXISTS jinmemo_pos_sessions_expiry ON jinmemo_pos_sessions(expires_at);
      CREATE TABLE IF NOT EXISTS jinmemo_audit (id text PRIMARY KEY, admin_id text NOT NULL, action text NOT NULL, entity_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS jinmemo_orders (
        id text PRIMARY KEY, code text NOT NULL UNIQUE, request_id text NOT NULL UNIQUE, request_hash text NOT NULL,
        access_hash text NOT NULL, snapshot jsonb NOT NULL, contact jsonb NOT NULL,
        booking_status text NOT NULL DEFAULT 'REQUESTED', payment_status text NOT NULL DEFAULT 'UNPAID', instructions text NOT NULL DEFAULT '',
        version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS jinmemo_carts(id text PRIMARY KEY,code text NOT NULL UNIQUE,request_id text NOT NULL UNIQUE,request_hash text NOT NULL,channel text NOT NULL,partner_id text,counter_id text,access_hash text NOT NULL,secret text NOT NULL,total bigint NOT NULL,version integer NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS jinmemo_cart_orders(cart_id text NOT NULL REFERENCES jinmemo_carts(id),order_id text PRIMARY KEY REFERENCES jinmemo_orders(id),position integer NOT NULL);
      CREATE INDEX IF NOT EXISTS jinmemo_cart_orders_cart ON jinmemo_cart_orders(cart_id);
      CREATE TABLE IF NOT EXISTS jinmemo_cart_actions(id text PRIMARY KEY,cart_id text NOT NULL REFERENCES jinmemo_carts(id),request_hash text NOT NULL);
      CREATE TABLE IF NOT EXISTS jinmemo_gateway_attempts(id text PRIMARY KEY,order_id text NOT NULL REFERENCES jinmemo_orders(id),provider text NOT NULL,mode text NOT NULL,amount bigint NOT NULL,config_version integer NOT NULL,config jsonb NOT NULL,status text NOT NULL DEFAULT 'PENDING',created_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz NOT NULL);
      CREATE INDEX IF NOT EXISTS jinmemo_gateway_attempt_order ON jinmemo_gateway_attempts(order_id,provider);
      CREATE TABLE IF NOT EXISTS jinmemo_paypal_orders(id text PRIMARY KEY,attempt_id text NOT NULL UNIQUE REFERENCES jinmemo_gateway_attempts(id),approval_url text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS jinmemo_gateway_events(id text PRIMARY KEY,attempt_id text REFERENCES jinmemo_gateway_attempts(id),order_id text REFERENCES jinmemo_orders(id),provider text NOT NULL,mode text NOT NULL,amount bigint NOT NULL,status text NOT NULL,reason text NOT NULL,fingerprint text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS jinmemo_gateway_resolutions(event_id text PRIMARY KEY REFERENCES jinmemo_gateway_events(id),target_code text NOT NULL,admin_id text NOT NULL,note text NOT NULL,original_reason text NOT NULL,original_order_id text,created_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS jinmemo_sepay_payloads(id text PRIMARY KEY,payload_encrypted text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
      CREATE INDEX IF NOT EXISTS jinmemo_sepay_payloads_date ON jinmemo_sepay_payloads(created_at);
      CREATE INDEX IF NOT EXISTS jinmemo_gateway_event_status_date ON jinmemo_gateway_events(status,created_at);
      CREATE TABLE IF NOT EXISTS jinmemo_supply_lots(id text PRIMARY KEY,request_hash text NOT NULL,supplier_id text NOT NULL REFERENCES jinmemo_suppliers(id),product_id text NOT NULL REFERENCES jinmemo_products(id),variant_id text NOT NULL,customer_type text NOT NULL,unit_cost bigint NOT NULL,total_quantity integer NOT NULL,valid_from text NOT NULL,valid_to text NOT NULL,priority integer NOT NULL DEFAULT 100,enabled boolean NOT NULL DEFAULT true,data jsonb NOT NULL,version integer NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now());
      ALTER TABLE jinmemo_supply_lots ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
      ALTER TABLE jinmemo_supply_lots ADD COLUMN IF NOT EXISTS unlimited boolean NOT NULL DEFAULT false;
      CREATE TABLE IF NOT EXISTS jinmemo_supply_purchases(id text PRIMARY KEY,lot_id text NOT NULL REFERENCES jinmemo_supply_lots(id),supplier_id text NOT NULL REFERENCES jinmemo_suppliers(id),order_id text NOT NULL REFERENCES jinmemo_orders(id),customer_type text NOT NULL,quantity integer NOT NULL CHECK(quantity>0),unit_cost bigint NOT NULL,data jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
      CREATE INDEX IF NOT EXISTS jinmemo_supply_purchases_lot_date ON jinmemo_supply_purchases(lot_id,created_at);
      CREATE INDEX IF NOT EXISTS jinmemo_supply_purchases_supplier_date ON jinmemo_supply_purchases(supplier_id,created_at);
      CREATE INDEX IF NOT EXISTS jinmemo_supply_lots_supplier_date ON jinmemo_supply_lots(supplier_id,created_at);
      CREATE INDEX IF NOT EXISTS jinmemo_supply_lots_product ON jinmemo_supply_lots(product_id);
      CREATE TABLE IF NOT EXISTS jinmemo_supply_allocations(order_id text NOT NULL REFERENCES jinmemo_orders(id),lot_id text NOT NULL REFERENCES jinmemo_supply_lots(id),quantity integer NOT NULL,unit_cost bigint NOT NULL,released boolean NOT NULL DEFAULT false,PRIMARY KEY(order_id,lot_id));
      CREATE INDEX IF NOT EXISTS jinmemo_supply_allocation_lot ON jinmemo_supply_allocations(lot_id);
      CREATE TABLE IF NOT EXISTS jinmemo_supply_actions(id text PRIMARY KEY,order_id text NOT NULL REFERENCES jinmemo_orders(id),request_hash text NOT NULL);
      CREATE TABLE IF NOT EXISTS jinmemo_supplier_payments(id text PRIMARY KEY,supplier_id text NOT NULL REFERENCES jinmemo_suppliers(id),amount bigint NOT NULL,method text NOT NULL,reference text NOT NULL UNIQUE,note text NOT NULL,request_hash text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
      CREATE INDEX IF NOT EXISTS jinmemo_supplier_payments_supplier_date ON jinmemo_supplier_payments(supplier_id,created_at);
      CREATE INDEX IF NOT EXISTS jinmemo_orders_created ON jinmemo_orders(created_at);
      CREATE INDEX IF NOT EXISTS jinmemo_orders_created_page ON jinmemo_orders(created_at DESC,id DESC);
      CREATE TABLE IF NOT EXISTS jinmemo_inventory_configs(product_id text PRIMARY KEY REFERENCES jinmemo_products(id),enabled boolean NOT NULL DEFAULT false,version integer NOT NULL DEFAULT 1);
      CREATE TABLE IF NOT EXISTS jinmemo_inventory_buckets(product_id text NOT NULL REFERENCES jinmemo_products(id),variant_id text NOT NULL,visit_date text NOT NULL,slot_id text NOT NULL DEFAULT '',capacity integer NOT NULL,low_stock_threshold integer NOT NULL DEFAULT 5,PRIMARY KEY(product_id,variant_id,visit_date,slot_id));
      CREATE TABLE IF NOT EXISTS jinmemo_inventory_allocations(order_id text PRIMARY KEY REFERENCES jinmemo_orders(id),product_id text NOT NULL REFERENCES jinmemo_products(id),variant_id text NOT NULL,visit_date text NOT NULL,slot_id text NOT NULL DEFAULT '',quantity integer NOT NULL,released boolean NOT NULL DEFAULT false,version integer NOT NULL DEFAULT 1);
      CREATE TABLE IF NOT EXISTS jinmemo_voucher_uses(order_id text PRIMARY KEY REFERENCES jinmemo_orders(id),voucher_id text NOT NULL REFERENCES jinmemo_vouchers(id),released boolean NOT NULL DEFAULT false);
      CREATE INDEX IF NOT EXISTS jinmemo_voucher_usage ON jinmemo_voucher_uses(voucher_id);
      CREATE INDEX IF NOT EXISTS jinmemo_inventory_allocations_scope ON jinmemo_inventory_allocations(product_id,visit_date);
      CREATE TABLE IF NOT EXISTS jinmemo_order_archives(order_id text PRIMARY KEY REFERENCES jinmemo_orders(id),archived_by text NOT NULL,reason text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS jinmemo_order_payments (
        id text PRIMARY KEY, order_id text NOT NULL UNIQUE REFERENCES jinmemo_orders(id), amount bigint NOT NULL,
        reference text NOT NULL UNIQUE, admin_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS jinmemo_order_payments_created ON jinmemo_order_payments(created_at);
      CREATE TABLE IF NOT EXISTS jinmemo_counters(id text PRIMARY KEY,data jsonb NOT NULL,version integer NOT NULL DEFAULT 1);
      CREATE TABLE IF NOT EXISTS jinmemo_pos_orders(order_id text PRIMARY KEY REFERENCES jinmemo_orders(id),counter_id text NOT NULL REFERENCES jinmemo_counters(id),admin_id text NOT NULL);
      CREATE TABLE IF NOT EXISTS jinmemo_pos_shifts(id text PRIMARY KEY,counter_id text NOT NULL REFERENCES jinmemo_counters(id),opened_by text NOT NULL,opened_name text NOT NULL,counter_name text NOT NULL,opening_cash bigint NOT NULL,opening_note text NOT NULL,open_hash text NOT NULL,opened_at timestamptz NOT NULL DEFAULT now(),closed_at timestamptz,closed_by text,close_request text UNIQUE,close_hash text,close_note text,summary jsonb,version integer NOT NULL DEFAULT 1);
      CREATE INDEX IF NOT EXISTS jinmemo_pos_shifts_counter ON jinmemo_pos_shifts(counter_id,opened_at DESC);
      CREATE TABLE IF NOT EXISTS jinmemo_pos_open_shifts(counter_id text PRIMARY KEY REFERENCES jinmemo_counters(id),shift_id text NOT NULL UNIQUE REFERENCES jinmemo_pos_shifts(id));
      CREATE TABLE IF NOT EXISTS jinmemo_pos_shift_receipts(payment_id text PRIMARY KEY REFERENCES jinmemo_order_payments(id),shift_id text NOT NULL REFERENCES jinmemo_pos_shifts(id));
      CREATE TABLE IF NOT EXISTS jinmemo_pos_cash_movements(id text PRIMARY KEY,shift_id text NOT NULL REFERENCES jinmemo_pos_shifts(id),kind text NOT NULL CHECK(kind IN ('IN','OUT')),amount bigint NOT NULL CHECK(amount>0),reference text NOT NULL,note text NOT NULL,actor_id text NOT NULL,actor_name text NOT NULL,request_hash text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
      CREATE INDEX IF NOT EXISTS jinmemo_pos_cash_movements_shift ON jinmemo_pos_cash_movements(shift_id,created_at);
      CREATE INDEX IF NOT EXISTS jinmemo_pos_shift_receipts_shift ON jinmemo_pos_shift_receipts(shift_id);
      CREATE TABLE IF NOT EXISTS jinmemo_payment_methods(payment_id text PRIMARY KEY REFERENCES jinmemo_order_payments(id),method text NOT NULL);
      CREATE TABLE IF NOT EXISTS jinmemo_order_tickets (
        id text PRIMARY KEY, order_id text NOT NULL REFERENCES jinmemo_orders(id), code text NOT NULL, code_hash text NOT NULL UNIQUE,
        kind text NOT NULL, covers integer NOT NULL, note text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS jinmemo_ticket_stock(id text PRIMARY KEY,lot_id text NOT NULL REFERENCES jinmemo_supply_lots(id),code text NOT NULL,code_hash text NOT NULL UNIQUE,status text NOT NULL DEFAULT 'AVAILABLE',version integer NOT NULL DEFAULT 1,reason text NOT NULL DEFAULT '',order_id text REFERENCES jinmemo_orders(id),ticket_id text REFERENCES jinmemo_order_tickets(id),created_at timestamptz NOT NULL DEFAULT now());
      CREATE INDEX IF NOT EXISTS jinmemo_ticket_stock_lot_status ON jinmemo_ticket_stock(lot_id,status);
      CREATE TABLE IF NOT EXISTS jinmemo_stock_imports(id text PRIMARY KEY,lot_id text NOT NULL REFERENCES jinmemo_supply_lots(id),request_hash text NOT NULL,quantity integer NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS jinmemo_ticket_files(id text PRIMARY KEY,order_id text NOT NULL REFERENCES jinmemo_orders(id),ticket_id text NOT NULL REFERENCES jinmemo_order_tickets(id),name text NOT NULL,mime text NOT NULL,bytes integer NOT NULL,hash text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),revoked_at timestamptz,revoke_reason text NOT NULL DEFAULT '');
      ALTER TABLE jinmemo_ticket_files ADD COLUMN IF NOT EXISTS file_kind text NOT NULL DEFAULT 'ORIGINAL';
      ALTER TABLE jinmemo_ticket_files ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
      ALTER TABLE jinmemo_ticket_files ADD COLUMN IF NOT EXISTS partner_shared boolean NOT NULL DEFAULT false;
      ALTER TABLE jinmemo_ticket_files ADD COLUMN IF NOT EXISTS sharing_version integer NOT NULL DEFAULT 1;
      CREATE INDEX IF NOT EXISTS jinmemo_ticket_files_order ON jinmemo_ticket_files(order_id);
      CREATE TABLE IF NOT EXISTS jinmemo_order_actions (
        id text PRIMARY KEY, order_id text NOT NULL REFERENCES jinmemo_orders(id), request_hash text NOT NULL,
        admin_id text NOT NULL, action text NOT NULL, note text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS jinmemo_media (
        id text PRIMARY KEY, filename text NOT NULL, alt text NOT NULL, width integer NOT NULL, height integer NOT NULL,
        bytes integer NOT NULL, created_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS jinmemo_product_types (
        id text PRIMARY KEY, slug text NOT NULL UNIQUE, data jsonb NOT NULL, version integer NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS jinmemo_pages(id text PRIMARY KEY,slug text NOT NULL UNIQUE,data jsonb NOT NULL,version integer NOT NULL DEFAULT 1,updated_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS jinmemo_post_categories (name text PRIMARY KEY);
      ALTER TABLE jinmemo_post_categories ADD COLUMN IF NOT EXISTS english_name text;
      ALTER TABLE jinmemo_post_categories ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
      CREATE TABLE IF NOT EXISTS jinmemo_posts (
        id text PRIMARY KEY, slug text NOT NULL UNIQUE, data jsonb NOT NULL, version integer NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS jinmemo_post_revisions(post_id text NOT NULL REFERENCES jinmemo_posts(id),version integer NOT NULL,data jsonb NOT NULL,saved_by text NOT NULL,reason text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(post_id,version));
      CREATE TABLE IF NOT EXISTS jinmemo_slug_aliases (kind text NOT NULL, slug text NOT NULL, entity_id text NOT NULL, PRIMARY KEY(kind,slug));
      CREATE TABLE IF NOT EXISTS jinmemo_price_groups (id text PRIMARY KEY, data jsonb NOT NULL, version integer NOT NULL DEFAULT 1);
      CREATE TABLE IF NOT EXISTS jinmemo_partners (id text PRIMARY KEY, email text NOT NULL UNIQUE, password_hash text NOT NULL, data jsonb NOT NULL, version integer NOT NULL DEFAULT 1);
      CREATE TABLE IF NOT EXISTS jinmemo_partner_sessions (token_hash text PRIMARY KEY, partner_id text NOT NULL REFERENCES jinmemo_partners(id), expires_at timestamptz NOT NULL);
      CREATE TABLE IF NOT EXISTS jinmemo_partner_orders (order_id text PRIMARY KEY REFERENCES jinmemo_orders(id), partner_id text NOT NULL REFERENCES jinmemo_partners(id));
      CREATE TABLE IF NOT EXISTS jinmemo_partner_shares (id text PRIMARY KEY,order_id text NOT NULL REFERENCES jinmemo_orders(id),access_hash text NOT NULL UNIQUE,created_at timestamptz NOT NULL DEFAULT now());
      ALTER TABLE jinmemo_partner_shares ADD COLUMN IF NOT EXISTS revoked_at timestamptz;
      CREATE INDEX IF NOT EXISTS jinmemo_partner_shares_order ON jinmemo_partner_shares(order_id);
      CREATE TABLE IF NOT EXISTS jinmemo_partner_share_actions(id text PRIMARY KEY,order_id text NOT NULL REFERENCES jinmemo_orders(id));
      CREATE TABLE IF NOT EXISTS jinmemo_payment_references (reference text PRIMARY KEY, kind text NOT NULL, entity_id text NOT NULL, amount bigint NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS jinmemo_partner_ledger (
        id text PRIMARY KEY, partner_id text NOT NULL REFERENCES jinmemo_partners(id), order_id text REFERENCES jinmemo_orders(id),
        kind text NOT NULL, amount bigint NOT NULL, reference text NOT NULL, note text NOT NULL, actor_id text NOT NULL,
        request_hash text NOT NULL, due_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS jinmemo_order_mail_keys(order_id text PRIMARY KEY REFERENCES jinmemo_orders(id),secret text NOT NULL);
      CREATE TABLE IF NOT EXISTS jinmemo_mail_outbox(id text PRIMARY KEY,order_id text NOT NULL REFERENCES jinmemo_orders(id),event text NOT NULL,status text NOT NULL DEFAULT 'PENDING',attempts integer NOT NULL DEFAULT 0,next_at timestamptz NOT NULL DEFAULT now(),last_error text NOT NULL DEFAULT '',created_at timestamptz NOT NULL DEFAULT now(),sent_at timestamptz);
      CREATE INDEX IF NOT EXISTS jinmemo_mail_order_history ON jinmemo_mail_outbox(order_id,created_at DESC,id DESC);
      CREATE INDEX IF NOT EXISTS jinmemo_partner_ledger_owner ON jinmemo_partner_ledger(partner_id);

CREATE TABLE IF NOT EXISTS jinmemo_transport_jobs(order_id text PRIMARY KEY REFERENCES jinmemo_orders(id),visit_date text NOT NULL,status text NOT NULL DEFAULT 'PENDING',data jsonb NOT NULL DEFAULT '{}',version integer NOT NULL DEFAULT 1);
CREATE INDEX IF NOT EXISTS jinmemo_transport_jobs_date ON jinmemo_transport_jobs(visit_date);

CREATE TABLE IF NOT EXISTS jinmemo_post_metrics(post_id text PRIMARY KEY REFERENCES jinmemo_posts(id),views bigint NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS jinmemo_post_view_keys(post_id text NOT NULL REFERENCES jinmemo_posts(id),fingerprint text NOT NULL,view_day text NOT NULL,PRIMARY KEY(post_id,fingerprint,view_day));
CREATE INDEX IF NOT EXISTS jinmemo_post_view_keys_day ON jinmemo_post_view_keys(view_day);

CREATE TABLE IF NOT EXISTS jinmemo_ride_bookings(
 id text PRIMARY KEY, code text NOT NULL UNIQUE, request_key text NOT NULL UNIQUE,
 visit_date text NOT NULL, status text NOT NULL, trip_id text,
 data jsonb NOT NULL, version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jinmemo_ride_bookings_trip ON jinmemo_ride_bookings(trip_id);
CREATE INDEX IF NOT EXISTS jinmemo_ride_bookings_date ON jinmemo_ride_bookings(visit_date);

CREATE TABLE IF NOT EXISTS jinmemo_ride_pools(id text PRIMARY KEY,visit_date text NOT NULL,from_id text NOT NULL,to_id text NOT NULL,vehicle_id text NOT NULL,departure text NOT NULL,target integer NOT NULL,total bigint NOT NULL,status text NOT NULL DEFAULT 'OPEN',data jsonb NOT NULL DEFAULT '{}',version integer NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS jinmemo_ride_pools_day ON jinmemo_ride_pools(visit_date,vehicle_id);
CREATE TABLE IF NOT EXISTS jinmemo_admin_notifications(id bigserial PRIMARY KEY,kind text NOT NULL,code text NOT NULL,href text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS jinmemo_admin_notification_reads(admin_id text PRIMARY KEY,last_id bigint NOT NULL DEFAULT 0);

ALTER TABLE jinmemo_admin_notification_reads ADD COLUMN IF NOT EXISTS last_ticket_id bigint;
ALTER TABLE jinmemo_admin_notification_reads ADD COLUMN IF NOT EXISTS last_car_id bigint;
