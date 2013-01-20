# Create your views here.
from django.http import HttpResponse
from django.template import Context, loader
from django.shortcuts import render, get_object_or_404

import ordrin
import ordrin.data
import ordrin.errors

ordrin_api_key = 'WoUgWjr9pBrJVAZdtQLIUi2nXvXEujWegL4PnGZ717M'

api = ordrin.APIs(ordrin_api_key, ordrin.TEST)

restaurant_id='5913'

def index(request):
    template = loader.get_template('billbuddy/index.html')
    restaurant_name = api.restaurant.get_details(restaurant_id)['name']
    context = Context({
        'restaurant_name': restaurant_name,
    })
    return HttpResponse(template.render(context))