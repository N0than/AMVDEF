import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, RefreshControl } from 'react-native';
import { supabase } from '../lib/supabase';

export default function PredictionsScreen() {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchPredictions() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('predictions_with_accuracy')
        .select(`
          prediction_id,
          predicted_audience,
          real_audience,
          calculated_accuracy,
          calculated_score,
          program:programs(
            name,
            channel,
            image_url
          )
        `)
        .eq('user_id', user.id)
        .order('prediction_id', { ascending: false });

      if (error) throw error;
      setPredictions(data || []);
    } catch (error) {
      console.error('Error fetching predictions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchPredictions();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPredictions();
  };

  const renderPrediction = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.programName}>{item.program.name}</Text>
        <Text style={styles.channel}>{item.program.channel}</Text>
      </View>
      <View style={styles.predictionDetails}>
        <View style={styles.detail}>
          <Text style={styles.label}>Votre pronostic</Text>
          <Text style={styles.value}>{item.predicted_audience.toFixed(1)}M</Text>
        </View>
        {item.real_audience && (
          <>
            <View style={styles.detail}>
              <Text style={styles.label}>Audience réelle</Text>
              <Text style={styles.value}>{item.real_audience.toFixed(1)}M</Text>
            </View>
            <View style={styles.detail}>
              <Text style={styles.label}>Précision</Text>
              <Text style={styles.value}>{item.calculated_accuracy?.toFixed(1)}%</Text>
            </View>
            <View style={styles.detail}>
              <Text style={styles.label}>Points</Text>
              <Text style={styles.value}>{item.calculated_score || 0}</Text>
            </View>
          </>
        )}
      </View>
    </View>
  );

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
      data={predictions}
      renderItem={renderPrediction}
      keyExtractor={(item) => item.prediction_id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListEmptyComponent={
        <View style={styles.centered}>
          <Text>Aucun pronostic</Text>
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
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    marginHorizontal: 15,
    marginVertical: 8,
    padding: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    marginBottom: 10,
  },
  programName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  channel: {
    fontSize: 16,
    color: '#666',
  },
  predictionDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  detail: {
    width: '48%',
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  value: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});