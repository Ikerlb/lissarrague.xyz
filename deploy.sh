# supposing i'm already authenticated with aws
# also (duh) hugo must be installed
echo "building static website with hugo..."
hugo

echo "cding to public directory..."
cd public
echo "pushing current dir to bucket..."
aws s3 cp . s3://lissarrague.xyz --recursive

# well this is the only distribution i
# plan to have on this account so yeah..
distribution_id=$(aws cloudfront list-distributions | jql --raw-output '"DistributionList"."Items".[0]."Id"')

# create invalidation 
aws cloudfront create-invalidation --distribution-id $distribution_id --paths="/*"

# just list the invalidations so I can see everything is OK
aws cloudfront list-invalidations --distribution-id $distribution_id
