import React, { useCallback, useState } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  IconButton,
  Fade,
  LinearProgress,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useDropzone } from 'react-dropzone';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAppSelector } from '../store/hooks';

interface DeckUploadProps {
  onUpload: (file: File) => void;
  isLoading: boolean;
  error?: string;
}

const UploadBox = styled(Box)(({ theme }) => ({
  border: `2px dashed ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(4),
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  backgroundColor: theme.palette.background.paper,
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.action.hover,
  },
}));

const FilePreview = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginTop: theme.spacing(2),
  backgroundColor: theme.palette.background.default,
}));

export const DeckUpload: React.FC<DeckUploadProps> = ({
  onUpload,
  isLoading,
  error,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const { progress, progressMessage } = useAppSelector((state) => state.deck);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const selectedFile = acceptedFiles[0];
        setFile(selectedFile);
        onUpload(selectedFile);
      }
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': [
        '.pptx',
      ],
      'application/vnd.ms-powerpoint': ['.ppt'],
    },
    maxFiles: 1,
    multiple: false,
  });

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box>
      <UploadBox
        {...getRootProps()}
        sx={{
          borderColor: dragActive ? 'primary.main' : 'divider',
          backgroundColor: dragActive ? 'action.hover' : 'background.paper',
        }}
      >
        <input {...getInputProps()} />
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <CloudUploadIcon
            sx={{
              fontSize: 48,
              color: 'primary.main',
              mb: 2,
            }}
          />
          <Typography variant="h6" gutterBottom>
            {isDragActive
              ? 'Drop your pitch deck here'
              : 'Drag and drop your pitch deck here'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            or click to browse files
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Supported formats: PDF, PPT, PPTX
          </Typography>
        </Box>
      </UploadBox>

      {file && (
        <Fade in>
          <FilePreview elevation={0}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <InsertDriveFileIcon color="primary" />
              <Box>
                <Typography variant="body2" noWrap>
                  {file.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatFileSize(file.size)}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {isLoading ? (
                <CircularProgress size={24} />
              ) : (
                <IconButton
                  size="small"
                  onClick={handleRemoveFile}
                  color="default"
                >
                  <DeleteIcon />
                </IconButton>
              )}
            </Box>
          </FilePreview>
        </Fade>
      )}

      {error && (
        <Fade in>
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        </Fade>
      )}

      {isLoading && !error && (
        <Fade in>
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Box sx={{ width: '100%', mr: 1 }}>
                <LinearProgress variant="determinate" value={progress} />
              </Box>
              <Box sx={{ minWidth: 35 }}>
                <Typography variant="body2" color="text.secondary">{`${Math.round(
                  progress
                )}%`}</Typography>
              </Box>
            </Box>
            <Typography variant="body2" color="text.secondary" align="center">
              {progressMessage}
            </Typography>
          </Box>
        </Fade>
      )}
    </Box>
  );
};
