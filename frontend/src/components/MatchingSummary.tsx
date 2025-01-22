import React from 'react';
import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  Box,
  Divider,
} from '@mui/material';
import { styled } from '@mui/material/styles';

interface DeckAnalysis {
  summary: string;
  entities: {
    organizations: string[];
    products: string[];
    technologies: string[];
    markets: string[];
  };
  key_topics: string[];
}

interface MatchingSummaryProps {
  analysis: DeckAnalysis;
}

const StyledChip = styled(Chip)(({ theme }) => ({
  margin: theme.spacing(0.5),
}));

export const MatchingSummary: React.FC<MatchingSummaryProps> = ({ analysis }) => {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Pitch Deck Analysis
      </Typography>

      <Typography variant="body2" color="text.secondary" paragraph>
        {analysis.summary}
      </Typography>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle2" gutterBottom>
        Key Topics
      </Typography>
      <Box sx={{ mb: 2 }}>
        {analysis.key_topics.map((topic) => (
          <StyledChip
            key={topic}
            label={topic}
            size="small"
            color="primary"
            variant="outlined"
          />
        ))}
      </Box>

      <List dense>
        {analysis.entities.organizations.length > 0 && (
          <ListItem>
            <ListItemText
              primary="Organizations"
              secondary={
                <Box sx={{ mt: 1 }}>
                  {analysis.entities.organizations.map((org) => (
                    <StyledChip
                      key={org}
                      label={org}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              }
            />
          </ListItem>
        )}

        {analysis.entities.technologies.length > 0 && (
          <ListItem>
            <ListItemText
              primary="Technologies"
              secondary={
                <Box sx={{ mt: 1 }}>
                  {analysis.entities.technologies.map((tech) => (
                    <StyledChip
                      key={tech}
                      label={tech}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              }
            />
          </ListItem>
        )}

        {analysis.entities.markets.length > 0 && (
          <ListItem>
            <ListItemText
              primary="Target Markets"
              secondary={
                <Box sx={{ mt: 1 }}>
                  {analysis.entities.markets.map((market) => (
                    <StyledChip
                      key={market}
                      label={market}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              }
            />
          </ListItem>
        )}
      </List>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', mt: 2, fontStyle: 'italic' }}
      >
        This analysis is used to match your pitch deck with relevant grant
        opportunities. The more specific your pitch deck, the better the matches
        will be.
      </Typography>
    </Paper>
  );
};
