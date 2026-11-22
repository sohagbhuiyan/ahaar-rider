import { Text, View } from 'react-native';

import { Badge } from '@/components/ui';
import type { Offer } from '@/lib/api/types';
import { formatMoney } from '@/lib/utils';

function Row({ icon, label, value, sub }: { icon: string; label: string; value: string; sub?: string | null }) {
  return (
    <View className="flex-row items-start gap-3">
      <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand-50 border border-brand-200">
        <Text className="text-base">{icon}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-[11px] font-bold uppercase tracking-wider text-text-muted">{label}</Text>
        <Text className="text-sm font-bold text-text-primary" numberOfLines={2}>
          {value}
        </Text>
        {sub ? (
          <Text className="text-xs text-text-secondary" numberOfLines={2}>
            {sub}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** Pickup, drop area, distance, size, cash and slot of an offer (no customer identity). */
export function OfferSummary({ offer, compact = false }: { offer: Offer; compact?: boolean }) {
  const cash = offer.cash_to_collect != null && offer.cash_to_collect > 0 ? offer.cash_to_collect : null;
  const drop = [offer.drop.area, offer.drop.city].filter(Boolean).join(', ') || 'Customer area';
  const slot = offer.slot ? `${offer.slot.name} · ${offer.slot.start_time}–${offer.slot.end_time}` : null;

  return (
    <View className="gap-3">
      <Row icon="🍳" label="Pickup" value={offer.branch?.name ?? 'Kitchen'} sub={compact ? null : offer.branch?.address} />
      <Row icon="📍" label="Drop-off area" value={drop} />

      <View className="flex-row flex-wrap gap-2">
        {offer.distance_km != null ? <Badge label={`${offer.distance_km.toFixed(1)} km`} variant="info" /> : null}
        <Badge label={`${offer.items_count} item${offer.items_count === 1 ? '' : 's'}`} variant="muted" />
        {slot ? <Badge label={slot} variant="outline" /> : null}
      </View>

      <View
        className={
          cash
            ? 'flex-row items-center justify-between rounded-xl bg-warning-soft border border-warning/30 px-3 py-2.5'
            : 'flex-row items-center justify-between rounded-xl bg-success-soft border border-success/20 px-3 py-2.5'
        }
      >
        <Text className={cash ? 'text-xs font-bold text-warning' : 'text-xs font-bold text-success'}>
          {cash ? 'Cash to collect' : 'Prepaid · no cash to collect'}
        </Text>
        <Text className="text-base font-black text-text-primary">
          {formatMoney(cash ?? offer.total_amount, offer.currency)}
        </Text>
      </View>
    </View>
  );
}
