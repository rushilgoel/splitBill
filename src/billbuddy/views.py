# Create your views here.
from django.http import HttpResponse
from django.template import Context, loader, RequestContext
from django.shortcuts import render, get_object_or_404
from django.core.context_processors import csrf
from django.shortcuts import render_to_response

import ordrin
import ordrin.data
import ordrin.errors

ordrin_api_key = 'WoUgWjr9pBrJVAZdtQLIUi2nXvXEujWegL4PnGZ717M'

api = ordrin.APIs(ordrin_api_key, ordrin.TEST)

restaurant_id='5913'
user_id='abc'

def index(request):
    template = loader.get_template('billbuddy/index.html')
    restaurant_name = api.restaurant.get_details(restaurant_id)['name']
    context = Context({
        'restaurant_name': restaurant_name,
        'restaurant_id' : restaurant_id,
        'user_id' : user_id,
    })
    return HttpResponse(template.render(context))

def check_in(request):
    user_id = request.POST['user_id']
    restaurant_id = request.POST['restaurant_id']
    
    context = {'user_id' : user_id, 'restaurant_id':restaurant_id, }
    #context.update(csrf(request))
    
    
    return render_to_response('billbuddy/check_in.html', context, context_instance=RequestContext(request))
    


def order(request, restaurant_id):
    restaurant_detail = api.restaurant.get_details(restaurant_id)
    menu = restaurant_detail['menu']
    
    context = {'menu' : menu}
    return render(request, 'billbuddy/order.html', context)