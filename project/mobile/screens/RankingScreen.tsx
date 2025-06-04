import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, RefreshControl, Image } from 'react-native';
import { supabase } from '../lib/supabase';

export default function RankingScreen() {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchRankings() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leaderboard_with_profiles')
        .select('*')
        .order('rank', { ascending: true });

      if (error) throw error;
      setRankings(data || []);
    } catch (error) {
      console.error('Error fetching rankings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchRankings();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRankings();
  };

  const renderRankingItem = ({ item }) => (
    <View style={styles.rankingItem}>
      <View style={styles.rankInfo}>
        <Text style={[styles.rank, getRankStyle(item.rank)]}>
          #{item.rank}
        </Text>
        {item.avatar_url ? (
          <Image
            source={{ uri: item.avatar_url }}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatar, styles.placeholderAvatar]}>
            <Text style={styles.initials}>
              {item.username.slice(0, 2).toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={styles.username}>{item.username}</Text>
      </View>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{item.total_score}</Text>
          <Text style={styles.statLabel}>points</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{item.precision_score}%</Text>
          <Text style={styles.statLabel}>précision</Text>
        </View>
      </View>
    </View>
  );

  const getRankStyle = (rank) => {
    switch (rank) {
      case 1:
        return styles.rankGold;
      case 2:
        return styles.rankSilver;
      case 3:
        return styles.rankBronze;
      default:
        return {};
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={rankings}
      renderItem={renderRankingItem}
      keyExtractor={(item) => item.user_id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListEmptyComponent={
        <View style={styles.centered}>
          <Text>Aucun classement disponible</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  rankingItem: {
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    marginHorizontal: 15,
    marginVertical: 4,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  rankInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rank: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  rankGold: {
    color: '#FFD700',
  },
  rankSilver: {
    color: '#C0C0C0',
  },
  rankBronze: {
    color: '#CD7F32',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  placeholderAvatar: {
    backgroundColor: '#6f5e90',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: 'white',
    fontWeight: 'bold',
  },
  username: {
    fontSize: 16,
    fontWeight: '500',
  },
  stats: {
    flexDirection: 'row',
    gap: 15,
  },
  stat: {
    alignItems: 'flex-end',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
});