# supposing i'm already authenticated with aws

echo "building static website with hugo..."
hugo

echo "cding to public directory..."
cd public
echo "pushing current dir to bucket..."
aws s3 cp . s3://lissarrague.xyz --recursive

